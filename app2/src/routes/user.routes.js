import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { deleteAccount, getPublicProfile, updateProfile, getOwnProfile, getUserThreads } from '../controllers/user.controller.js';
import { uploadProfilePicture } from '../middleware/upload.js';

const router = Router();

// User Access
router.get('/profile', authenticateToken, getOwnProfile);
router.delete('/profile', authenticateToken, deleteAccount);
router.put('/profile', authenticateToken, uploadProfilePicture, updateProfile); 

// Guest Access
router.get('/:username', getPublicProfile); 
router.get('/:username/threads', getUserThreads);

export default router;