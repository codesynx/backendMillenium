import { Request, Response } from 'express';
import * as sellerService from './seller.service';

export const getSellerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const stats = await sellerService.getSellerStatistics(sellerId);
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get seller statistics', details: error.message });
  }
};
