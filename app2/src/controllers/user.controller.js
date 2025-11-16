import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';

export const getPublicProfile = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                username: true,
                bio: true,
                profile_picture_path: true,
                created_at: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        res.status(200).json({ data: user });

    } catch (error) {
        console.error("Error fetching public profile:", error);
        res.status(500).json({ message: "Gagal mengambil profil publik.", error: error.message });
    }
};

// *** TARGET KERENTANAN A03:2021-Injection (XSS) pada field bio ***
export const updateProfile = async (req, res) => {
    const currentUserId = req.user.user_id;
    const { username, email, bio, password } = req.body;
    
    const dataToUpdate = {};

    // Tambahkan field ke objek update hanya jika ada di request
    if (username) dataToUpdate.username = username;
    if (email) dataToUpdate.email = email;
    if (bio) dataToUpdate.bio = bio;

    // Jika ada file gambar yang diunggah

    // --- IMPLEMENTASI RENTAN (RCE): Hanya mengandalkan ekstensi file dari klien ---
    // Di sini kita TIDAK melakukan validasi tipe MIME atau memeriksa magic bytes.
    // Jika penyerang mengunggah file yang terlihat seperti JPG tapi berisi Shell code,
    // dan ekstensi file diabaikan atau disalahgunakan (misal: "image.sh.jpg"), 
    // sistem rentan dieksekusi jika server web (Nginx) salah konfigurasi.
    if (req.file) {
        dataToUpdate.profile_picture_path = req.file.path;
    }

    // Jika ada password baru yang dikirimkan
    if (password) {
        const salt = await bcrypt.genSalt(10);
        dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ message: "Tidak ada data untuk diperbarui." });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { user_id: currentUserId },
            data: dataToUpdate,
            select: { user_id: true, username: true, email: true, bio: true, profile_picture_path: true }
        });

        res.status(200).json({ 
            message: "Profil berhasil diperbarui", 
            user: updatedUser 
        });

    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: "Username atau email sudah digunakan." });
        }
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Gagal memperbarui profil.", error: error.message });
    }
};

export const deleteAccount = async (req, res) => {
    const currentUserId = req.user.user_id;

    // --- KERENTANAN TARGET (A04/CSRF) ---
    // Cross-Site Request Forgery (CSRF - A04:2021/Insecure Design):
    //    Endpoint DELETE tanpa validasi CSRF token rentan. Kita tidak akan menambahkan 
    //    CSRF token, sehingga ini menjadi target Insecure Design.

    try {
        // Hapus pengguna. Prisma menangani penghapusan kaskade
        // pada tabel Thread, Post, PostLike, Attachment (jika di setup di schema)
        // Catatan: Jika Anda tidak mengatur ON DELETE CASCADE di skema prisma, 
        // Anda harus menghapus data terkait secara manual sebelum menghapus user.

        await prisma.user.delete({
            where: {
                user_id: currentUserId,
            },
        });
        res.status(200).json({ message: "Akun berhasil dihapus." });

    } catch (error) {
        if (error.code === 'P2025') {
             return res.status(404).json({ message: "Akun tidak ditemukan." });
        }
        console.error("Error during account deletion:", error);
        res.status(500).json({ message: "Gagal memproses penghapusan akun.", error: error.message });
    }
};

export const getOwnProfile = async (req, res) => {
    const currentUserId = req.user.user_id;

    try {
        const user = await prisma.user.findUnique({
            where: { user_id: currentUserId },
            select: {
                user_id: true,
                username: true,
                email: true,
                bio: true,
                profile_picture_path: true,
                created_at: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        res.status(200).json({ data: user });

    } catch (error) {
        console.error("Error fetching own profile:", error);
        res.status(500).json({ message: "Gagal mengambil profil.", error: error.message });
    }
};

export const getUserThreads = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        const threads = await prisma.thread.findMany({
            where: {
                user_id: user.user_id,
            },
            select: {
                thread_id: true,
                title: true,
                created_at: true,
                _count: {
                    select: { posts: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        res.status(200).json({
            message: `Daftar thread oleh ${username} berhasil diambil.`,
            data: threads
        });

    } catch (error) {
        console.error(`Error fetching threads for user ${username}:`, error);
        res.status(500).json({ message: "Gagal mengambil data thread.", error: error.message });
    }
};