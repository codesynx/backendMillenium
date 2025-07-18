import { PrismaClient, User, Role, SubType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validate, parse } from '@telegram-apps/init-data-node';
import crypto from 'crypto';
import { uploadFile, getSignedUrl } from '../gcs/gcs.service';

const prisma = new PrismaClient();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const register = async (data: any): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { email, password, role, ...restData } = data;

  if (!email || !password || !role) {
    throw new Error('Email, password, and role are required.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
      ...restData,
    },
  });

  if (role === Role.SELLER) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        type: SubType.FREE,
      },
    });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables.');
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

export const login = async (data: any): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const userWithPassword = await prisma.user.findUnique({ where: { email } });
  if (!userWithPassword) {
    throw new Error('Invalid credentials.');
  }

  const isPasswordValid = await bcrypt.compare(password, userWithPassword.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials.');
  }

  const { password: _, ...user } = userWithPassword;

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables.');
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  return { user, token };
};

export const signInWithTelegram = async (
  initDataRaw: string
): Promise<{ user: Omit<User, 'password'>; token: string; isNewUser: boolean }> => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables.');
  }

  try {
    // 1. Validate initData
    validate(initDataRaw, TELEGRAM_BOT_TOKEN, { expiresIn: 86400 }); // 1 day expiration
  } catch (error: any) {
    console.error('Telegram InitData validation failed:', error.message);
    throw new Error(`Telegram authentication failed: ${error.message}`);
  }

  // 2. Parse initData
  const initData = parse(initDataRaw, true); // true for camelCase keys
  const telegramUser = initData.user;

  if (!telegramUser || !telegramUser.id) {
    throw new Error('Invalid Telegram user data.');
  }

  let userRecord = await prisma.user.findUnique({
    where: { telegramId: String(telegramUser.id) },
  });

  let isNewUser = false;

  if (userRecord) {
    // User exists, update their Telegram info if necessary
    userRecord = await prisma.user.update({
      where: { id: userRecord.id },
      data: {
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName || undefined,
        username: telegramUser.username || undefined,
        photoUrl: telegramUser.photoUrl || undefined,
      },
    });
  } else {
    // New user, create them
    isNewUser = true;
    const placeholderEmail = `telegram_${telegramUser.id}@telegram.placeholder.com`;
    // Check if placeholder email already exists (highly unlikely but good practice)
    const existingEmailUser = await prisma.user.findUnique({ where: { email: placeholderEmail }});
    if (existingEmailUser) {
      // This case should be extremely rare. Handle by perhaps appending a random string or throwing a specific error.
      // For now, we'll assume it's unique enough.
      throw new Error('Placeholder email conflict. Please contact support.');
    }

    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    userRecord = await prisma.user.create({
      data: {
        telegramId: String(telegramUser.id),
        email: placeholderEmail,
        password: hashedPassword, // Required by schema, though user won't use it
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName || undefined,
        username: telegramUser.username || undefined,
        photoUrl: telegramUser.photoUrl || undefined,
        role: undefined, // Explicitly set to undefined for optional field
      },
    });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in the environment variables.');
  }

  // 3. Generate JWT
  const tokenPayload = {
    id: userRecord.id,
    role: userRecord.role,
    telegramId: userRecord.telegramId,
    firstName: userRecord.firstName,
    lastName: userRecord.lastName,
    username: userRecord.username,
    photoUrl: userRecord.photoUrl,
  };
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: '7d', // Longer expiry for Telegram users perhaps
  });

  const { password: _, ...userWithoutPassword } = userRecord;
  return { user: userWithoutPassword, token, isNewUser };
};

export const updateUserRole = async (userId: string, newRole: Role): Promise<Omit<User, 'password'>> => {
  if (!Object.values(Role).includes(newRole)) {
    throw new Error('Invalid role specified.');
  }

  const updatedUserWithPassword = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  const { password: _, ...userWithoutPassword } = updatedUserWithPassword;
  return userWithoutPassword;
};

export const getProfile = async (userId: string): Promise<Omit<User, 'password'>> => {
  const userWithPassword = await prisma.user.findUnique({ where: { id: userId } });
  if (!userWithPassword) {
    throw new Error('User not found.');
  }
  if (userWithPassword.photoUrl && !userWithPassword.photoUrl.startsWith('http')) {
    userWithPassword.photoUrl = await getSignedUrl(userWithPassword.photoUrl);
  }
  const { password: _, ...user } = userWithPassword;
  return user;
};

export const updateProfile = async (userId: string, data: any): Promise<Omit<User, 'password'>> => {
  const { ...updateData } = data;

  const userWithPassword = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  const { password: _, ...user } = userWithPassword;
  return user;
};

export const updateProfilePhoto = async (userId: string, file: Express.Multer.File | undefined): Promise<Omit<User, 'password'>> => {
  if (!file) {
    throw new Error('No photo provided.');
  }

  const fileName = await uploadFile(file);

  let userWithPassword = await prisma.user.update({
    where: { id: userId },
    data: { photoUrl: fileName },
  });

  if (userWithPassword.photoUrl) {
    userWithPassword.photoUrl = await getSignedUrl(userWithPassword.photoUrl);
  }

  const { password: _, ...user } = userWithPassword;
  return user;
};
