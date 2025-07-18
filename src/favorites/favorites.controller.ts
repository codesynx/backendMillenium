import { Request, Response } from 'express';
import * as favoritesService from './favorites.service';

export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const favorites = await favoritesService.getFavorites(userId);
    res.status(200).json(favorites);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get favorites', details: error.message });
  }
};

export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { productId } = req.params;
    const favorite = await favoritesService.addFavorite(userId, productId);
    res.status(201).json(favorite);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add favorite', details: error.message });
  }
};

export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { productId } = req.params;
    await favoritesService.removeFavorite(userId, productId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to remove favorite', details: error.message });
  }
};
