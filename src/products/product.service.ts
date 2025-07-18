import { PrismaClient } from '@prisma/client';
import type { Product } from '@prisma/client';
import { Role } from '@prisma/client';
import { uploadFile, getSignedUrl } from '../gcs/gcs.service';

const prisma = new PrismaClient();

// Helper to enhance a single product with a signed URL
export const enhanceProductWithSignedUrl = async (product: Product): Promise<Product> => {
  if (product.imageUrl) {
    product.imageUrl = await getSignedUrl(product.imageUrl);
  }
  return product;
};

// Helper to enhance multiple products with signed URLs
export const enhanceProductsWithSignedUrls = async (products: Product[]): Promise<Product[]> => {
  return Promise.all(products.map(enhanceProductWithSignedUrl));
};

export const createProduct = async (
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl' | 'sellerId' | 'category'> & { categoryId: string },
  file: Express.Multer.File,
  sellerId: string
): Promise<Product> => {
  const seller = await prisma.user.findUnique({ where: { id: sellerId } });
  if (!seller || seller.role !== Role.SELLER) {
    throw new Error('Only sellers can create products.');
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId: sellerId } });
  const productCount = await prisma.product.count({ where: { sellerId } });

  if (subscription?.type === 'FREE' && productCount >= 10) {
    throw new Error('Free plan limit reached. Upgrade to PRO to add more products.');
  }
  if (subscription?.type === 'PRO' && productCount >= 1000) {
    throw new Error('PRO plan limit reached.');
  }

  // Upload the file and get the filename
  const fileName = await uploadFile(file);

  const { categoryId, ...productData } = data;

  const product = await prisma.product.create({
    data: {
      ...productData,
      price: parseFloat(productData.price as any),
      // Store the filename instead of a public URL
      imageUrl: fileName,
      seller: {
        connect: {
          id: sellerId,
        },
      },
      category: {
        connect: {
          id: categoryId,
        },
      },
    },
    include: { category: true, seller: true }, // Ensure relations are returned
  });

  return enhanceProductWithSignedUrl(product);
};

export const getProducts = async (filters: any): Promise<Product[]> => {
  const { categoryId, search, listingType, city, sortBy, priceMin, priceMax } = filters;
  const where: any = {};

  if (categoryId) {
    // If categoryId is a comma-separated string, convert to array
    const categoryIds = typeof categoryId === 'string' ? categoryId.split(',') : categoryId;
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      where.categoryId = { in: categoryIds };
    } else if (typeof categoryId === 'string' && categoryId) {
       where.categoryId = categoryId;
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (listingType && listingType !== 'all') {
    where.listingType = listingType; // SALE or RENT
  }

  if (city) {
     // If city is a comma-separated string, handle multiple cities with OR
    const cities = typeof city === 'string' ? city.split(',') : city;
    if (Array.isArray(cities) && cities.length > 0) {
      where.location = { in: cities.map((c: string) => c.trim()), mode: 'insensitive' };
    } else if (typeof city === 'string' && city) {
      where.location = { contains: city.trim(), mode: 'insensitive' };
    }
  }
  
  if (priceMin !== undefined && priceMax !== undefined) {
    where.price = {
      gte: parseFloat(priceMin),
      lte: parseFloat(priceMax),
    };
  }


  let orderBy: any = { createdAt: 'desc' }; // Default sort

  if (sortBy) {
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'price_low':
        orderBy = { price: 'asc' };
        break;
      case 'price_high':
        orderBy = { price: 'desc' };
        break;
      // Add other sorting options like 'rating' if you have a rating field
    }
  }

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: { seller: true, category: true },
  });

  return enhanceProductsWithSignedUrls(products);
};

export const incrementProductViewCount = async (productId: string): Promise<Product | null> => {
  console.log(`[ProductService] Attempting to find product for view increment: ${productId}`);
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existingProduct) {
    console.log(`[ProductService] Product not found for view increment: ${productId}`);
    return null;
  }

  // Assuming TS types are now correct after user restarted editor
  const currentViewCount = existingProduct.viewCount || 0; 

  console.log(`[ProductService] Incrementing view for product ${productId} from ${currentViewCount} to ${currentViewCount + 1}`);

  const updatedProductFromDB = await prisma.product.update({
    where: { id: productId },
    data: {
      viewCount: currentViewCount + 1,
    },
  });
  
  console.log(`[ProductService] Product ${productId} updated. New view count from DB: ${updatedProductFromDB.viewCount}`);

  if (updatedProductFromDB) {
    // The type from prisma.product.update should be correct if types are resolved
    return enhanceProductWithSignedUrl(updatedProductFromDB);
  }
  return null;
};

export const getCategories = async (): Promise<any[]> => {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
    },
    include: {
      subCategories: {
        include: {
          subCategories: true,
        },
      },
    },
  });
  return categories;
};

export const getMyProducts = async (sellerId: string): Promise<Product[]> => {
    const products = await prisma.product.findMany({
        where: { sellerId },
        include: { category: true, seller: true }, // Added category and seller include
    });
    return enhanceProductsWithSignedUrls(products);
}

export const getProductById = async (id: string): Promise<Product | null> => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: true, category: true }, // Added category include
  });

  if (product) {
    return enhanceProductWithSignedUrl(product);
  }
  return null;
};

export const updateProduct = async (
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl' | 'category'>> & { categoryId?: string },
  file: Express.Multer.File | undefined,
  userId: string
): Promise<Product | null> => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.sellerId !== userId) {
    throw new Error('Product not found or you do not have permission to update it.');
  }

  const { categoryId, ...productData } = data;
  const updateData: any = { ...productData };

  if (categoryId) {
    updateData.category = {
      connect: {
        id: categoryId,
      },
    };
  }

  if (file) {
    const fileName = await uploadFile(file);
    updateData.imageUrl = fileName;
  }
  
  if (updateData.price) {
    updateData.price = parseFloat(updateData.price);
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: true, seller: true }, // Ensure relations are returned
  });

  return enhanceProductWithSignedUrl(updatedProduct);
};

export const deleteProduct = async (id: string, userId: string): Promise<Product | null> => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.sellerId !== userId) {
    throw new Error('Product not found or you do not have permission to delete it.');
  }
  // TODO: Delete the file from GCS before deleting the product from DB

  return prisma.product.delete({ where: { id } });
};
