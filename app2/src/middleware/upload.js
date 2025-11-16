// app2/src/middleware/upload.js
import multer from 'multer';
import path from 'path';

// --- FUNGSI BARU UNTUK KEAMANAN FILE (Perbaikan RCE/Arbitrary Upload) ---
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg)$/i;

const imageFileFilter = (req, file, cb) => {
    // [Perbaikan RCE] 1. Periksa Ekstensi
    if (!file.originalname.match(ALLOWED_EXTENSIONS)) {
        return cb(new Error('Hanya file gambar (JPG/JPEG/PNG/GIF/SVG) yang diizinkan!'), false);
    }
    
    // [Perbaikan RCE] 2. Periksa MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error('MIME Type file tidak valid. Hanya gambar yang diizinkan.'), false);
    }
    
    // Jika lolos kedua cek
    cb(null, true);
};
// --- END FUNGSI KEAMANAN ---


const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profiles/'); 
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `user-${req.user.user_id}-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const attachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/attachments/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `post-${req.params.postId}-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const threadAttachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/attachments/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        // Buat nama file unik untuk thread
        const filename = `thread-${req.params.id}-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

// [Perbaikan RCE] Terapkan fileFilter ke semua konfigurasi multer
export const uploadProfilePicture = multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: imageFileFilter 
}).single('profile_picture');

export const uploadAttachment = multer({
    storage: attachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter 
}).single('file');

export const uploadThreadAttachment = multer({
    storage: threadAttachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter 
}).single('file');