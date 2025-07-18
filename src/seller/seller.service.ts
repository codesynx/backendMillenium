import { PrismaClient, Product, Role } from '@prisma/client';
import { enhanceProductsWithSignedUrls } from '../products/product.service'; // Assuming this can be reused

const prisma = new PrismaClient();

interface RecentProductInfo {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  views?: number; // Consistent with frontend interface
  status?: string; // Consistent with frontend interface
}

export interface SellerStats {
  totalProducts: number;
  activeProducts: number; // Placeholder
  totalViews: number;    // Placeholder for aggregated views
  totalSales: number;    // Placeholder
  thisMonthSales: number;// Placeholder
  rating: number;        // Placeholder
  recentProducts: RecentProductInfo[];
}

export const getSellerStatistics = async (sellerId: string): Promise<SellerStats> => {
  const totalProducts = await prisma.product.count({
    where: { sellerId },
  });

  const recentDbProducts = await prisma.product.findMany({
    where: { sellerId },
    orderBy: { createdAt: 'desc' },
    take: 3, // Fetch 3 recent products as in frontend
    include: {
      // No category needed here based on SellerDashboard's current recentProducts rendering
    }
  });
  
  // Enhance image URLs for recent products
  const enhancedRecentProducts = await enhanceProductsWithSignedUrls(recentDbProducts as any[]); // Cast needed if Product type from import is strict

  const recentProducts: RecentProductInfo[] = enhancedRecentProducts.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.imageUrl,
    // views and status are not in the Product model yet, so they won't be here
    // If they were, you'd map them: p.views, p.status
  }));

  // Placeholder values for stats not yet implemented
  const activeProducts = 0; // TODO: Implement when 'status' field is added to Product model
  const totalViews = 0;     // TODO: Implement when 'views' field is added and tracked for Product model
  const totalSales = 0;     // TODO: Implement with an Order model or sales tracking
  const thisMonthSales = 0; // TODO: Implement with an Order model or sales tracking
  const rating = 0;         // TODO: Implement with a Review/Rating model

  return {
    totalProducts,
    activeProducts,
    totalViews,
    totalSales,
    thisMonthSales,
    rating,
    recentProducts,
  };
};
