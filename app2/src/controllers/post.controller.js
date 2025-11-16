import { prisma } from '../config/prisma.js';

// *** TARGET KERENTANAN X-11: Injection (XSS) pada 'content' ***
export const createPost = async (req, res) => {
    const currentUserId = req.user.user_id;
    const threadId = parseInt(req.params.threadId);
    const { content } = req.body;

    if (isNaN(threadId) || !content) {
        return res.status(400).json({ message: "ID Thread tidak valid atau konten balasan kosong." });
    }

    try {
        const threadExists = await prisma.thread.findUnique({
            where: { thread_id: threadId }
        });

        if (!threadExists) {
            return res.status(404).json({ message: "Thread yang dituju tidak ditemukan." });
        }

        // ** IMPLEMENTASI RENTAN: Tidak ada sanitasi pada 'content' **
        const newPost = await prisma.post.create({
            data: {
                user_id: currentUserId,
                thread_id: threadId,
                content,
            }
        });

        res.status(201).json({ 
            message: "Balasan berhasil dibuat (VULNERABLE XSS)", 
            post: newPost 
        });

    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ message: "Gagal membuat balasan.", error: error.message });
    }
};

// *** TARGET KERENTANAN C-8: Broken Access Control (BAC) - Post Update ***
export const updatePost = async (req, res) => {
    const currentUserId = req.user.user_id;
    const postId = parseInt(req.params.postId);
    const { content } = req.body;

    if (isNaN(postId)) {
        return res.status(400).json({ message: "ID Post tidak valid." });
    }
    if (!content) {
        return res.status(400).json({ message: "Konten tidak boleh kosong." });
    }

    try {
        // [Perbaikan BAC] Menambahkan user_id di kondisi where
        const updatedPost = await prisma.post.update({
            where: {
                post_id: postId,
                user_id: currentUserId, // <-- BARIS BARU: Memastikan hanya pemilik yang bisa update
            },
            data: {
                content,
            },
        });

        res.status(200).json({
            message: "Balasan berhasil diperbarui (BAC Fixed)", // Ubah pesan
            post: updatedPost,
        });

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Balasan tidak ditemukan atau Anda tidak memiliki izin untuk mengeditnya." });
        }
        console.error("Error updating post:", error);
        res.status(500).json({ message: "Gagal memperbarui balasan.", error: error.message });
    }
};

// *** TARGET KERENTANAN C-9: Broken Access Control (BAC) - Post Delete ***
export const deletePost = async (req, res) => {
    const currentUserId = req.user.user_id;
    const postId = parseInt(req.params.postId);

    if (isNaN(postId)) {
        return res.status(400).json({ message: "ID Post tidak valid." });
    }

    try {
        // [Perbaikan BAC] Menambahkan user_id di kondisi where
        await prisma.post.delete({
            where: {
                post_id: postId,
                user_id: currentUserId, // <-- BARIS BARU: Memastikan hanya pemilik yang bisa delete
            },
        });

        res.status(200).json({ message: "Balasan berhasil dihapus (BAC Fixed)." }); // Ubah pesan

    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Balasan tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya." });
        }
        console.error("Error deleting post:", error);
        res.status(500).json({ message: "Gagal menghapus balasan.", error: error.message });
    }
};

export const toggleLikePost = async (req, res) => {
    const currentUserId = req.user.user_id;
    const postId = parseInt(req.params.postId);

    if (isNaN(postId)) {
        return res.status(400).json({ message: "ID Post tidak valid." });
    }
    const uniqueKey = { post_id: postId, user_id: currentUserId };

    try {
        const existingLike = await prisma.postLike.findUnique({
            where: {
                post_id_user_id: uniqueKey,
            }
        });

        if (existingLike) {
            await prisma.postLike.delete({
                where: {
                    post_id_user_id: uniqueKey,
                },
            });
            return res.status(200).json({ message: "Unlike berhasil." });

        } else {
            await prisma.postLike.create({
                data: uniqueKey,
            });
            return res.status(201).json({ message: "Like berhasil." });
        }

    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ message: "Gagal memproses operasi like.", error: error.message });
    }
};

export const getPostsByThread = async (req, res) => {
    const threadId = parseInt(req.params.threadId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID Thread tidak valid." });
    }

    try {
        const [posts, totalPosts] = await Promise.all([
            prisma.post.findMany({
                where: { thread_id: threadId },
                skip: skip,
                take: limit,
                include: {
                    author: { select: { username: true, profile_picture_path: true } },
                    _count: { select: { postLikes: true } },
                    attachments: true
                },
                orderBy: {
                    created_at: 'asc',
                }
            }),
            prisma.post.count({ where: { thread_id: threadId } })
        ]);

        const totalPages = Math.ceil(totalPosts / limit);

        res.status(200).json({
            message: "Daftar balasan berhasil diambil.",
            data: posts,
            pagination: {
                totalItems: totalPosts,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        console.error("Error fetching posts by thread:", error);
        res.status(500).json({ message: "Gagal mengambil balasan.", error: error.message });
    }
};