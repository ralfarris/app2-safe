import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { uploadAttachmentToPost } from '../controllers/attachment.controller.js';
import { uploadAttachment } from '../middleware/upload.js';
import { toggleLikePost, updatePost, deletePost } from '../controllers/post.controller.js';
import { getFileAttachment, getAttachmentById } from '../controllers/file.controller.js'; 

const router = Router();


router.get('/file', getFileAttachment); 

router.get('/:id', getAttachmentById); 

router.post('/:postId/attachments', 
    authenticateToken, 
    uploadAttachment, 
    uploadAttachmentToPost
);

router.post('/:postId/like', 
    authenticateToken, 
    toggleLikePost
);

router.put('/:postId', authenticateToken, updatePost);
router.delete('/:postId', authenticateToken, deletePost);

export default router;