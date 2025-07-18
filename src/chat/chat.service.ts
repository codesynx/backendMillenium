import { PrismaClient, Chat, Message } from '@prisma/client';

const prisma = new PrismaClient();

export const getOrCreateChat = async (
  participantIds: string[]
): Promise<Chat> => {
  // TODO: This is not the most efficient way to find a chat with exact participants.
  // This should be optimized later if performance becomes an issue.
  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        every: {
          id: { in: participantIds },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  const chat = chats.find(c => c.participants.length === participantIds.length);


  if (chat) {
    return chat;
  }

  // Create a new chat if one doesn't exist
  return prisma.chat.create({
    data: {
      participants: {
        connect: participantIds.map((id) => ({ id })),
      },
    },
  });
};

export const createMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<Message> => {
  // When a message is created, update the chat's updatedAt timestamp
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        chatId,
        senderId,
        receiverId,
        text,
      },
      include: { // Include sender details in the returned message
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            companyName: true,
          },
        },
      }
    }),
    prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    }),
  ]);
  return message;
};

export const getChatMessages = async (chatId: string): Promise<Message[]> => {
  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
    include: { sender: true, receiver: true },
  });
};

export const getUserChats = async (userId: string): Promise<Chat[]> => {
    const initialChats = await prisma.chat.findMany({ // Renamed to initialChats
        where: {
            participants: {
                some: {
                    id: userId,
                },
            },
        },
        include: {
            participants: true,
            messages: { // To get the last message for display, and potentially for sorting
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1, 
            },
        },
    });

    // Calculate unread counts for each chat
    const chatsWithUnreadCounts = await Promise.all(
        initialChats.map(async (chat) => { // Use initialChats here
            const unreadCount = await prisma.message.count({
                where: {
                    chatId: chat.id,
                    senderId: { not: userId }, // Messages not sent by the current user
                    readReceipts: {
                        none: {
                            readerId: userId,
                        },
                    },
                },
            });
            return { ...chat, unreadCount };
        })
    );
    // Sort chats: chats with unread messages first, then by last activity
    return chatsWithUnreadCounts.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        const lastMessageA = a.messages[0]?.createdAt || a.updatedAt || a.createdAt;
        const lastMessageB = b.messages[0]?.createdAt || b.updatedAt || b.createdAt;
        return new Date(lastMessageB).getTime() - new Date(lastMessageA).getTime();
    });
}

export const getChatById = async (chatId: string): Promise<Chat | null> => {
    return prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            participants: true,
        },
    });
};

export const markMessagesAsRead = async (chatId: string, readerId: string): Promise<void> => {
    // Find messages in the chat that were not sent by the reader and don't have a read receipt by this reader
    const unreadMessages = await prisma.message.findMany({
        where: {
            chatId: chatId,
            senderId: {
                not: readerId,
            },
            readReceipts: {
                none: {
                    readerId: readerId,
                },
            },
        },
        select: {
            id: true,
        },
    });

    if (unreadMessages.length > 0) {
        // Create read receipts for these messages
        await prisma.messageReadReceipt.createMany({
            data: unreadMessages.map((msg) => ({
                messageId: msg.id,
                readerId: readerId,
            })),
            skipDuplicates: true, // In case of concurrent requests, though less likely here
        });

        // Update the chat's updatedAt timestamp as reading messages is an activity
        await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
        });
    }
};
