import { PrismaClient, Product } from '@prisma/client'; // Import Product type
import { enhanceProductWithSignedUrl } from '../products/product.service'; // Import the helper

const prisma = new PrismaClient();

export const getFavorites = async (userId: string): Promise<any[]> => {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          seller: true, 
          category: true, 
        },
      },
    },
  });

  // Enhance each product in the favorites list with a signed URL
  const enhancedFavorites = await Promise.all(
    favorites.map(async (fav) => {
      if (fav.product) {
        // Ensure fav.product is not null and conforms to the Product type for enhanceProductWithSignedUrl
        const productWithUrl = await enhanceProductWithSignedUrl(fav.product as any); // Use 'as any' if type mismatch, or ensure types align
        return { ...fav, product: productWithUrl };
      }
      return fav;
    })
  );

  return enhancedFavorites;
};

export const addFavorite = async (userId: string, productId: string): Promise<any> => {
  return prisma.favorite.create({
    data: {
      userId,
      productId,
    },
  });
};

export const removeFavorite = async (userId: string, productId: string): Promise<any> => {
  return prisma.favorite.delete({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
};
