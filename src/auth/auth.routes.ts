import { Router } from 'express';
import multer from 'multer';
import * as authController from './auth.controller';
import { protect } from './auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/telegram/callback', authController.signInWithTelegram); // New Telegram login route

// Profile and role updates (protected)
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.put('/profile/photo', protect, upload.single('photo'), authController.updateProfilePhoto);
router.put('/me/role', protect, authController.updateUserRole); // New route to update user role

export default router;
