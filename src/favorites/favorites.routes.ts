import { Router } from 'express';
import { protect } from '../auth/auth.middleware';
import * as favoritesController from './favorites.controller';

const router = Router();

router.use(protect);

router.get('/', favoritesController.getFavorites);
router.post('/:productId', favoritesController.addFavorite);
router.delete('/:productId', favoritesController.removeFavorite);

export default router;
