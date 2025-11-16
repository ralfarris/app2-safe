import multer from 'multer';
import path from 'path';

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Path yang aman seharusnya di folder yang tidak bisa dieksekusi,
        // tapi kita sengaja membuat folder 'profiles' yang mudah diakses.
        // **CATATAN RENTAN:** Jika kita tidak memvalidasi jenis file di controller,
        // file dengan ekstensi .sh bisa dieksekusi (RCE).
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
        // Path Attachment (akan diuji untuk Path Traversal)
        cb(null, 'uploads/attachments/');
    },
    filename: (req, file, cb) => {
        // **CATATAN RENTAN (Path Traversal/Overwrite):**
        // Jika kita hanya menggunakan nama file asli (atau bagian darinya) tanpa sanitasi 
        // yang ketat dan tidak mengecek path, penyerang bisa mencoba
        // filename: "../../../config.js"

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

export const uploadProfilePicture = multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 }
}).single('profile_picture');

export const uploadAttachment = multer({
    storage: attachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('file');

export const uploadThreadAttachment = multer({
    storage: threadAttachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('file');
