import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import authRoutes from './auth/auth.routes';
import productRoutes from './products/product.routes';
import chatRoutes from './chat/chat.routes';
import favoriteRoutes from './favorites/favorites.routes';
import { createChatServer } from './chat/chat.server';

dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/favorites', favoriteRoutes);

app.get('/', (req, res) => {
  res.send('Millennium Backend is running!');
});

createChatServer(server);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export { app, prisma };
