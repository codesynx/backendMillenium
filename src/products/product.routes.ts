import { Router } from 'express';
import multer from 'multer';
import { protect } from '../auth/auth.middleware';
import * as productController from './product.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/my-products', protect, productController.getMyProducts); // Add this line
router.get('/:id', productController.getProductById);
router.post('/:id/view', productController.incrementViewCount); // New route for incrementing view count

// Seller-only routes
router.post(
  '/',
  protect,
  upload.single('image'),
  productController.createProduct
);
router.put(
  '/:id',
  protect,
  upload.single('image'),
  productController.updateProduct
);
router.delete('/:id', protect, productController.deleteProduct);

export default router;
