import { ProductManager } from '@/lib/products/ProductManager';
import { prisma } from '@/lib/prisma';
import { mockProducts, mockCategories } from '../mocks/data';

jest.mock('@/lib/prisma', () => ({
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(prisma)),
}));

describe('ProductManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importProducts', () => {
    it('should successfully import products', async () => {
      const mockFile = Buffer.from('mock file content');
      const mockResult = { success: 2, failed: 0, errors: [] };

      (prisma.product.create as jest.Mock).mockResolvedValueOnce(mockProducts[0]);
      (prisma.product.create as jest.Mock).mockResolvedValueOnce(mockProducts[1]);

      const result = await ProductManager.importProducts(mockFile, 'xlsx');

      expect(result).toEqual(mockResult);
      expect(prisma.product.create).toHaveBeenCalledTimes(2);
    });

    it('should handle import failures', async () => {
      const mockFile = Buffer.from('mock file content');
      const mockError = new Error('Import failed');

      (prisma.product.create as jest.Mock).mockRejectedValueOnce(mockError);

      const result = await ProductManager.importProducts(mockFile, 'xlsx');

      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('createProductBundle', () => {
    it('should create a product bundle with correct pricing', async () => {
      const bundleData = {
        name: 'Test Bundle',
        products: [
          { id: 'product1', quantity: 2 },
          { id: 'product2', quantity: 1 }
        ],
        discount: 0.1
      };

      (prisma.product.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'product1', price: 100 },
        { id: 'product2', price: 150 }
      ]);

      (prisma.product.create as jest.Mock).mockResolvedValueOnce({
        id: 'bundle1',
        name: bundleData.name,
        price: 315 // (100 * 2 + 150) * 0.9
      });

      const result = await ProductManager.createProductBundle(
        bundleData.name,
        bundleData.products,
        bundleData.discount
      );

      expect(result.price).toBe(315);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: bundleData.name,
            isBundle: true
          })
        })
      );
    });
  });

  describe('applyPriceRule', () => {
    it('should apply percentage discount correctly', async () => {
      const productIds = ['product1'];
      const rule = {
        type: 'PERCENTAGE' as const,
        value: 20
      };

      (prisma.product.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'product1', price: 100 }
      ]);

      await ProductManager.applyPriceRule(productIds, rule);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product1' },
          data: expect.objectContaining({
            price: 80
          })
        })
      );
    });

    it('should apply fixed price correctly', async () => {
      const productIds = ['product1'];
      const rule = {
        type: 'FIXED' as const,
        value: 75
      };

      (prisma.product.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'product1', price: 100 }
      ]);

      await ProductManager.applyPriceRule(productIds, rule);

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product1' },
          data: expect.objectContaining({
            price: 75
          })
        })
      );
    });
  });
});