// app2/src/controllers/thread.controller.js
import { Prisma } from '@prisma/client'; 
import { prisma } from '../config/prisma.js';
import { sanitizeContent } from '../utils/sanitizer.js'; // <-- PERUBAHAN #1: BARIS BARU

// Controller untuk melihat daftar thread (Guest Access)
export const getThreads = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const [threads, totalThreads] = await Promise.all([
            prisma.thread.findMany({
                skip: skip,
                take: limit,
                select: {
                    thread_id: true,
                    title: true,
                    content: true,
                    created_at: true,
                    author: {
                        select: { username: true, profile_picture_path: true }
                    },
                    attachments: {
                        select: { file_path: true }
                    },
                    _count: {
                        select: {
                            posts: true,
                            threadLikes: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc',
                }
            }),
            prisma.thread.count()
        ]);

        const totalPages = Math.ceil(totalThreads / limit);

        res.status(200).json({
            message: "Daftar thread berhasil diambil.",
            data: threads,
            pagination: {
                totalItems: totalThreads,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error("Error fetching threads:", error);
        res.status(500).json({ message: "Gagal mengambil data thread.", error: error.message });
    }
};

export const getThreadDetail = async (req, res) => {
    const threadId = parseInt(req.params.id);

    if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID Thread tidak valid." });
    }

    try {
        const thread = await prisma.thread.findUnique({
            where: { thread_id: threadId },
            include: {
                author: {
                    select: { username: true, profile_picture_path: true }
                },
                attachments: true,
                posts: {
                    include: {
                        author: {
                            select: { username: true, profile_picture_path: true }
                        },
                        _count: {
                            select: { postLikes: true }
                        }
                    },
                    orderBy: { created_at: 'asc' }
                },
                _count: {
                    select: {
                        posts: true ,
                        threadLikes: true
                    }
                }
            }
        });

        if (!thread) {
            return res.status(404).json({ message: "Thread tidak ditemukan." });
        }

        res.status(200).json({
            message: "Detail thread berhasil diambil.",
            data: thread
        });

    } catch (error) {
        console.error("Error fetching thread detail:", error);
        res.status(500).json({ message: "Gagal mengambil detail thread.", error: error.message });
    }
};

// *** TARGET KERENTANAN I-1: SQL Injection (SQLi) - FIXED ***
export const searchThreads = async (req, res) => {
    const keyword = req.query.q;

    if (!keyword) {
        return res.status(400).json({ message: "Kata kunci pencarian ('q') diperlukan." });
    }

    // Perbaikan AMAN: Menggunakan Parameterized Query dengan Prisma.sql
    try {
        const searchPattern = `%${keyword}%`;
        
        const threads = await prisma.$queryRaw(Prisma.sql`
            SELECT 
                t.thread_id, 
                t.title, 
                t.content, 
                t.created_at, 
                u.username AS author_username,
                u.profile_picture_path AS author_profile_picture_path
            FROM "thread" t
            JOIN "user" u ON t.user_id = u.user_id
            WHERE t.title ILIKE ${searchPattern} OR t.content ILIKE ${searchPattern}
            ORDER BY t.created_at DESC;
        `);

        
        res.status(200).json({
            message: "Hasil pencarian berhasil diambil (SQLi Fixed)",
            data: threads
        });

    } catch (error) {
        console.error("Error during vulnerable search:", error);
        res.status(500).json({ message: "Gagal memproses pencarian.", error: error.message });
    }
};


// *** TARGET KERENTANAN X-10: Injection (XSS) pada 'content' ***
export const createThread = async (req, res) => {
    const currentUserId = req.user.user_id;
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: "Judul dan konten harus diisi." });
    }

    try {
        // [Perbaikan XSS] Sanitasi konten sebelum disimpan
        const safeContent = sanitizeContent(content); // <-- PERUBAHAN #2: BARIS BARU
        
        const newThread = await prisma.thread.create({
            data: {
                user_id: currentUserId,
                title,
                content: safeContent, // <-- PERUBAHAN #3: Gunakan safeContent
            }
        });

        res.status(201).json({ 
            message: "Thread berhasil dibuat (XSS Fixed)", // PERUBAHAN #4: Ubah pesan
            thread: newThread 
        });

    } catch (error) {
        console.error("Error creating thread:", error);
        res.status(500).json({ message: "Gagal membuat thread.", error: error.message });
    }
};

// *** TARGET KERENTANAN C-7: Broken Access Control (BAC) - Thread Update - FIXED ***
export const updateThread = async (req, res) => {
    const currentUserId = req.user.user_id;
    const threadId = parseInt(req.params.id);
    const { title, content } = req.body;

    if (isNaN(threadId) || (!title && !content)) {
        return res.status(400).json({ message: "ID Thread tidak valid atau data yang diubah kosong." });
    }

    try {
        // [Perbaikan BAC] 1. Cek kepemilikan resource
        const thread = await prisma.thread.findUnique({
            where: { thread_id: threadId },
        });

        if (!thread) {
            return res.status(404).json({ message: "Thread tidak ditemukan." });
        }
        
        if (thread.user_id !== currentUserId) {
            return res.status(403).json({ message: "Akses Ditolak. Anda hanya dapat mengedit thread milik Anda sendiri." });
        }
        
        const updatedThread = await prisma.thread.update({
            where: {
                thread_id: threadId,
            },
            data: {
                title,
                content,
            }
        });

        res.status(200).json({
            message: "Thread berhasil diperbarui (BAC Fixed)", 
            thread: updatedThread
        });

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Thread tidak ditemukan." });
        }
        console.error("Error updating thread:", error);
        res.status(500).json({ message: "Gagal memperbarui thread.", error: error.message });
    }
};

// *** TARGET KERENTANAN C-6: Broken Access Control (BAC) - Thread Delete - FIXED ***
export const deleteThread = async (req, res) => {
    const currentUserId = req.user.user_id;
    const threadId = parseInt(req.params.id);

    if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID Thread tidak valid." });
    }

    try {
        // [Perbaikan BAC] Menambahkan user_id di kondisi where
        await prisma.thread.delete({
            where: {
                thread_id: threadId,
                user_id: currentUserId, 
            }
        });

        res.status(200).json({
            message: "Thread berhasil dihapus (BAC Fixed)." 
        });

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Thread tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya." });
        }
        console.error("Error deleting thread:", error);
        res.status(500).json({ message: "Gagal menghapus thread.", error: error.message });
    }
};

export const toggleLikeThread = async (req, res) => {
    const currentUserId = req.user.user_id;
    const threadId = parseInt(req.params.id);

    if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID Thread tidak valid." });
    }
    const uniqueKey = { thread_id: threadId, user_id: currentUserId };

    try {
        const existingLike = await prisma.threadLike.findUnique({
            where: {
                thread_id_user_id: uniqueKey,
            }
        });

        if (existingLike) {
            await prisma.threadLike.delete({
                where: {
                    thread_id_user_id: uniqueKey,
                },
            });
            return res.status(200).json({ message: "Unlike thread berhasil." });

        } else {
            await prisma.threadLike.create({
                data: uniqueKey,
            });
            return res.status(201).json({ message: "Like thread berhasil." });
        }
    } catch (error) {
        console.error("Error toggling thread like:", error);
        res.status(500).json({ message: "Gagal memproses operasi like thread.", error: error.message });
    }
};