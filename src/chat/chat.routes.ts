import { Router } from 'express';
import { protect } from '../auth/auth.middleware';
import * as chatController from './chat.controller';

const router = Router();

router.post('/', protect, chatController.createOrGetChat);
router.get('/', protect, chatController.getChats);
router.get('/:chatId', protect, chatController.getChatById);
router.get('/:chatId/messages', protect, chatController.getMessages);
router.post('/:chatId/read', protect, chatController.markChatAsRead); // New route for marking chat as read

export default router;
