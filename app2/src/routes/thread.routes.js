import { Router } from 'express';
import { 
    getThreads, 
    createThread, 
    getThreadDetail, 
    searchThreads,
    updateThread,
    deleteThread,
    toggleLikeThread
} from '../controllers/thread.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { createPost, getPostsByThread } from '../controllers/post.controller.js'; 
import { uploadThreadAttachment } from '../middleware/upload.js';
import { uploadAttachmentToThread } from '../controllers/attachment.controller.js';

const router = Router();

// Guest Access
router.get('/', getThreads); 
router.get('/search', searchThreads); // SQL Injection Target
router.get('/:id', getThreadDetail);
router.get('/:threadId/posts', getPostsByThread);

// User Access
router.post('/', authenticateToken, createThread); // XSS Target
router.post('/:threadId/posts', authenticateToken, createPost); // XSS Target
router.put('/:id', authenticateToken, updateThread);   // BAC Target
router.delete('/:id', authenticateToken, deleteThread); // BAC Target
router.post('/:id/like', authenticateToken, toggleLikeThread);
router.post('/:id/attachments', authenticateToken, uploadThreadAttachment, uploadAttachmentToThread); 

export default router;