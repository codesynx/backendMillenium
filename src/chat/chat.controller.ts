import { Request, Response } from 'express';
import * as chatService from './chat.service';

export const createOrGetChat = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { participantIds } = req.body;
  
      if (!userId || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        res.status(400).json({ error: 'User ID and participant IDs are required.' });
        return;
      }
  
      // Ensure the current user is part of the chat
      const allParticipantIds = [...new Set([userId, ...participantIds])];
  
      const chat = await chatService.getOrCreateChat(allParticipantIds);
      res.status(200).json(chat);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create or get chat', details: error.message });
    }
};

export const getChats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const chats = await chatService.getUserChats(userId);
        res.status(200).json(chats);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get chats', details: error.message });
    }
}

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const messages = await chatService.getChatMessages(chatId);
    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get messages', details: error.message });
  }
};

export const markChatAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await chatService.markMessagesAsRead(chatId, userId);
    res.status(200).json({ message: 'Chat marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark chat as read', details: error.message });
  }
};

export const getChatById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const chat = await chatService.getChatById(chatId);
        if (chat) {
            res.status(200).json(chat);
        } else {
            res.status(404).json({ error: 'Chat not found' });
        }
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get chat', details: error.message });
    }
}
