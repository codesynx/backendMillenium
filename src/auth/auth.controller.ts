import { Request, Response } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({ user, token });
  } catch (error: any) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.status(200).json({ user, token });
  } catch (error: any) {
    res.status(401).json({ error: 'Login failed', details: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Profile update failed', details: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get profile', details: error.message });
  }
};

export const updateProfilePhoto = async (req: Request, res: Response) => {
  try {
    const user = await authService.updateProfilePhoto(req.user.id, req.file);
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Profile photo update failed', details: error.message });
  }
};

export const signInWithTelegram = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.header('authorization');
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing.' });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'tma') {
      res.status(401).json({ error: 'Invalid Authorization header format. Expected "tma <initDataRaw>".' });
      return;
    }

    const initDataRaw = parts[1];
    if (!initDataRaw) {
      // This case should ideally be caught by the length check, but good to be explicit
      res.status(400).json({ error: 'initDataRaw is missing in Authorization header.' });
      return;
    }

    const result = await authService.signInWithTelegram(initDataRaw);
    res.status(200).json(result);
  } catch (error: any) {
    // Log the actual error on the server for debugging
    console.error("Error in signInWithTelegram controller:", error); 
    if (error.message.includes("Telegram authentication failed:")) {
      // More specific error from service layer due to initData validation
      res.status(401).json({ error: 'Telegram authentication failed', details: error.message });
    } else {
      res.status(500).json({ error: 'Telegram sign-in failed', details: error.message });
    }
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id; // Assuming auth middleware populates req.user
    const { role } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated.' });
      return;
    }
    if (!role) {
      res.status(400).json({ error: 'Role is required.' });
      return;
    }

    const updatedUser = await authService.updateUserRole(userId, role);
    res.status(200).json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user role', details: error.message });
  }
};
