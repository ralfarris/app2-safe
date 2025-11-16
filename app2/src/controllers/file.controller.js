import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';

// Tentukan root direktori unggahan (penting untuk validasi path)
const UPLOAD_ROOT_DIR = path.join(process.cwd(), 'uploads'); 

// *** TARGET KERENTANAN A04:2021 (Path Traversal/LFI) ***
export const getFileAttachment = async (req, res) => {
    // Penyerang bisa memanipulasi filePath: "attachments/../../../etc/passwd"
    const { filePath } = req.query; 

    if (!filePath) {
        return res.status(400).json({ message: "Parameter filePath diperlukan." });
    }

    // [Perbaikan LFI] Menggunakan path.normalize dan path.resolve untuk mencegah Path Traversal
    
    // 1. Normalisasi path untuk menghapus .. dan .
    const normalizedPath = path.normalize(filePath);

    // 2. Tentukan Path Absolut yang DIMAKSUD
    const absolutePath = path.join(UPLOAD_ROOT_DIR, normalizedPath);
    
    // 3. PENTING: Periksa Path Traversal (Harus di dalam UPLOAD_ROOT_DIR)
    // path.resolve akan menghasilkan path absolut sebenarnya dari path masukan.
    const resolvedPath = path.resolve(absolutePath);

    if (!resolvedPath.startsWith(UPLOAD_ROOT_DIR)) {
        console.warn(`Path Traversal attempt blocked: ${filePath}`);
        return res.status(403).json({ message: "Akses ditolak (Path Traversal)." }); // <-- Blokir akses
    }

    if (!fs.existsSync(resolvedPath)) { // <-- Gunakan resolvedPath
        console.warn(`File not found: ${resolvedPath}`);
        return res.status(404).json({ message: "File attachment tidak ditemukan." });
    }
    
    try {
        // Mengirimkan file ke klien
        res.sendFile(resolvedPath); // <-- Gunakan resolvedPath
    } catch (error) {
        console.error("Error sending file:", error);
        res.status(500).json({ message: "Gagal menyajikan file." });
    }
};

// Fungsi bantuan untuk mendapatkan path dari database (Jika ingin menggunakan ID)
// *** TARGET KERENTANAN A-3: Path Traversal/LFI (via Attachment ID) ***
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

        // [Perbaikan LFI] Menggunakan logika validasi path yang sama
        // 1. Tentukan Path Absolut yang DIMAKSUD
        const absolutePath = path.join(UPLOAD_ROOT_DIR, filePath);
        
        // 2. PENTING: Verifikasi Path Traversal dengan path.resolve
        const resolvedPath = path.resolve(absolutePath);

        if (!resolvedPath.startsWith(UPLOAD_ROOT_DIR)) {
            console.warn(`Path Traversal attempt blocked (Attachment ID): ${filePath}`);
            return res.status(403).json({ message: "Akses ditolak (Path Traversal)." }); // <-- Blokir akses
        }


        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ message: "File fisik tidak ditemukan." });
        }
        
        res.sendFile(resolvedPath);

    } catch (error) {
        console.error("Error fetching attachment by ID:", error);
        res.status(500).json({ message: "Gagal mengambil file attachment." });
    }
}