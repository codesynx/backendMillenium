import { Request, Response } from 'express';
import * as productService from './product.service';

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Product image is required.' });
      return;
    }
    const product = await productService.createProduct(req.body, req.file, sellerId);
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await productService.getProducts(req.query);
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get products', details: error.message });
  }
};

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await productService.getCategories();
    res.status(200).json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get categories', details: error.message });
  }
};

export const getMyProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const sellerId = req.user?.id;
        if (!sellerId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const products = await productService.getMyProducts(sellerId);
        res.status(200).json(products);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get your products', details: error.message });
    }
}

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (product) {
      res.status(200).json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get product', details: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const product = await productService.updateProduct(req.params.id, req.body, req.file, userId);
    if (product) {
      res.status(200).json(product);
    } else {
      res.status(404).json({ error: 'Product not found or permission denied' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const product = await productService.deleteProduct(req.params.id, userId);
    if (product) {
      res.status(200).json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ error: 'Product not found or permission denied' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
};

export const incrementViewCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`[ProductController] Received request to increment view for product ID: ${id}`);

    const product = await productService.incrementProductViewCount(id);
    
    if (product && typeof product.viewCount === 'number') {
      console.log(`[ProductController] View count for ${id} incremented to ${product.viewCount}. Responding to client.`);
      res.status(200).json({ message: 'View count incremented', viewCount: product.viewCount });
    } else if (product) {
      // This case should ideally not be hit if types are correct and service returns full product
      console.warn(`[ProductController] Product ${id} found but viewCount is undefined or not a number after increment. Product data:`, product);
      res.status(500).json({ error: 'Failed to retrieve valid view count after increment' });
    } else {
      console.log(`[ProductController] Product ${id} not found for view increment by service. Responding 404.`);
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error: any) {
    console.error(`[ProductController] Error incrementing view count for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to increment view count', details: error.message });
  }
};
