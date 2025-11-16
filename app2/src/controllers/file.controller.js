import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';

const UPLOAD_ROOT_DIR = path.join(process.cwd(), 'uploads'); 

// *** TARGET KERENTANAN A04:2021 (Path Traversal/LFI) ***
export const getFileAttachment = async (req, res) => {
    // Penyerang bisa memanipulasi filePath: "attachments/../../../etc/passwd"
    const { filePath } = req.query; 

    if (!filePath) {
        return res.status(400).json({ message: "Parameter filePath diperlukan." });
    }

    // --- IMPLEMENTASI RENTAN ---
    // Tidak ada sanitasi path atau normalisasi.
    // Jika path berisi `../`, path akan keluar dari direktori `uploads`.
    const absolutePath = path.join(UPLOAD_ROOT_DIR, filePath);
    
    // Opsional: Cek database untuk memastikan file ada dan path valid
    // Kita lewati langkah ini untuk menjaga kesederhanaan dan fokus pada Path Traversal di OS.

    if (!fs.existsSync(absolutePath)) {
        console.warn(`File not found: ${absolutePath}`);
        return res.status(404).json({ message: "File attachment tidak ditemukan." });
    }
    
    // Cek apakah file yang diminta berada di dalam UPLOAD_ROOT_DIR.
    // Jika absolutePath berada di luar UPLOAD_ROOT_DIR, ini adalah Path Traversal.

    // Pemeriksaan Aman (yang kita tidak gunakan untuk demonstrasi kerentanan):
    // if (!absolutePath.startsWith(UPLOAD_ROOT_DIR)) {
    //     return res.status(403).json({ message: "Akses path ditolak." });
    // }

    try {
        // Mengirimkan file ke klien
        res.sendFile(absolutePath);
    } catch (error) {
        console.error("Error sending file:", error);
        res.status(500).json({ message: "Gagal menyajikan file." });
    }
};

// Fungsi bantuan untuk mendapatkan path dari database (Jika ingin menggunakan ID)
export const getAttachmentById = async (req, res) => {
    const attachmentId = parseInt(req.params.id);

    try {
        const attachment = await prisma.attachment.findUnique({
            where: { attachment_id: attachmentId }
        });

        if (!attachment) {
            return res.status(404).json({ message: "Attachment tidak ditemukan di database." });
        }
        
        // Mengambil file_path dari database
        const filePath = attachment.file_path; 

        // --- IMPLEMENTASI RENTAN (Path Traversal/LFI) ---
        // Penyerang yang memiliki akses ke database (melalui SQLi atau BAC lain)
        // dapat mengubah `file_path` menjadi `../../../etc/passwd`.
        const absolutePath = path.join(process.cwd(), filePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: "File fisik tidak ditemukan." });
        }
        
        res.sendFile(absolutePath);

    } catch (error) {
        console.error("Error fetching attachment by ID:", error);
        res.status(500).json({ message: "Gagal mengambil file attachment." });
    }
}