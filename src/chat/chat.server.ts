import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import * as chatService from './chat.service';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const createChatServer = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Allow all origins for testing purposes
      methods: ["GET", "POST"]
    }
  });

  // Middleware for authentication
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token as string;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        socket.userId = decoded.id;
        console.log(`[CHAT_SERVER_IO] Socket authenticated for userId: ${socket.userId}`);
        next();
      } catch (error) {
        console.error('[CHAT_SERVER_IO] Socket Authentication Error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    } else {
      console.error('[CHAT_SERVER_IO] Socket Authentication Error: Token required');
      next(new Error('Authentication error: Token required'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.userId) {
      console.error('[CHAT_SERVER_IO] Connection attempt without userId after middleware.');
      socket.disconnect(true); // Force disconnect if userId is somehow not set
      return;
    }
    console.log(`[CHAT_SERVER_IO] Client connected: ${socket.id}, userId: ${socket.userId}`);

    // Join a room based on userId to allow direct messaging
    socket.join(socket.userId);

    socket.on('sendMessage', async (data: { chatId: string; text: string; receiverId: string }) => {
      const { chatId, text, receiverId } = data;
      
      if (!socket.userId) {
        console.error('[CHAT_SERVER_IO] sendMessage error: socket.userId is missing.');
        socket.emit('messageError', { error: 'Authentication required to send messages.' });
        return;
      }

      console.log(`[CHAT_SERVER_IO] Message from ${socket.userId} to ${receiverId} in chat ${chatId}: ${text}`);

      try {
        const savedMessage = await chatService.createMessage(
          chatId,
          socket.userId,
          receiverId,
          text
        );

        // Send message to the receiver's room
        io.to(receiverId).emit('newMessage', savedMessage);
        // Send message back to the sender for confirmation
        socket.emit('newMessage', savedMessage);

        console.log(`[CHAT_SERVER_IO] Message sent and emitted:`, savedMessage);

      } catch (error: any) {
        console.error('[CHAT_SERVER_IO] Failed to process message:', error);
        socket.emit('messageError', { error: 'Failed to process message', details: error.message });
      }
    });

    socket.on('markAsRead', async (data: { messageId: string; chatId: string }) => {
        if (!socket.userId) {
            console.error('[CHAT_SERVER_IO] markAsRead error: socket.userId is missing.');
            socket.emit('messageError', { error: 'Authentication required.' });
            return;
        }
        try {
            await chatService.markMessagesAsRead(data.messageId, socket.userId);
            // Potentially notify other clients in the chat that the message was read
            // For simplicity, we're not broadcasting read receipts here but you could.
            // Example: io.to(data.chatId).emit('messageRead', { messageId: data.messageId, userId: socket.userId });
            console.log(`[CHAT_SERVER_IO] Message ${data.messageId} marked as read by ${socket.userId}`);
        } catch (error: any) {
            console.error('[CHAT_SERVER_IO] Failed to mark message as read:', error);
            socket.emit('messageError', { error: 'Failed to mark message as read', details: error.message });
        }
    });

    socket.on('disconnect', () => {
      console.log(`[CHAT_SERVER_IO] Client disconnected: ${socket.id}, userId: ${socket.userId}`);
    });

    socket.on('error', (error) => {
        console.error('[CHAT_SERVER_IO] Socket error:', error);
    });
  });

  return io;
};
