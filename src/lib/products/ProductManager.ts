import { prisma } from '@/lib/prisma';
import { ImageService } from '../image/ImageService';
import { CacheService } from '../cache/CacheService';
import { SearchService } from '../search/SearchService';
import { InventoryService } from '../inventory/InventoryService';
import { Product, Variant } from '@prisma/client';
import xlsx from 'xlsx';

interface ProductImportData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sku: string;
  stockQuantity: number;
  specifications?: Record<string, any>;
  variants?: Array<{
    name: string;
    sku: string;
    price: number;
    stockQuantity: number;
    attributes: Record<string, any>;
  }>;
}

interface ProductExportOptions {
  format: 'csv' | 'xlsx';
  includeVariants?: boolean;
  includeSales?: boolean;
}

interface PriceRule {
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  conditions?: {
    minQuantity?: number;
    categoryId?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export class ProductManager {
  static async importProducts(
    file: Buffer,
    format: 'csv' | 'xlsx'
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    try {
      const workbook = xlsx.read(file);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const products: ProductImportData[] = xlsx.utils.sheet_to_json(worksheet);

      for (const productData of products) {
        try {
          await prisma.$transaction(async (tx) => {
            // Create main product
            const product = await tx.product.create({
              data: {
                name: productData.name,
                description: productData.description,
                price: productData.price,
                categoryId: productData.categoryId,
                sku: productData.sku,
                stockQuantity: productData.stockQuantity,
                specifications: productData.specifications || {}
              }
            });

            // Create variants if any
            if (productData.variants?.length) {
              await tx.variant.createMany({
                data: productData.variants.map(variant => ({
                  productId: product.id,
                  ...variant
                }))
              });
            }

            // Index in search
            await SearchService.indexProduct(product);

            imported++;
          });
        } catch (error) {
          failed++;
          errors.push(`Failed to import ${productData.name}: ${error.message}`);
        }
      }

      return { success: imported, failed, errors };
    } catch (error) {
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  static async exportProducts(options: ProductExportOptions): Promise<Buffer> {
    try {
      const products = await prisma.product.findMany({
        include: {
          variants: options.includeVariants,
          category: true,
          ...(options.includeSales && {
            orderItems: {
              include: {
                order: {
                  select: {
                    createdAt: true,
                    status: true
                  }
                }
              }
            }
          })
        }
      });

      const exportData = products.map(product => ({
        ID: product.id,
        Name: product.name,
        Description: product.description,
        Price: product.price,
        SKU: product.sku,
        Category: product.category.name,
        StockQuantity: product.stockQuantity,
        ...(options.includeVariants && {
          Variants: product.variants.length,
          'Variant SKUs': product.variants.map(v => v.sku).join(', ')
        }),
        ...(options.includeSales && {
          'Total Sales': product.orderItems.length,
          'Revenue': product.orderItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
          )
        })
      }));

      const worksheet = xlsx.utils.json_to_sheet(exportData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');

      return options.format === 'csv'
        ? xlsx.write(workbook, { bookType: 'csv', type: 'buffer' })
        : xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  static async createProductBundle(
    name: string,
    products: Array<{ id: string; quantity: number }>,
    discount: number
  ): Promise<Product> {
    try {
      const productDetails = await prisma.product.findMany({
        where: {
          id: {
            in: products.map(p => p.id)
          }
        }
      });

      const totalPrice = productDetails.reduce((sum, product) => {
        const quantity = products.find(p => p.id === product.id)?.quantity || 1;
        return sum + (product.price * quantity);
      }, 0);

      const bundlePrice = totalPrice * (1 - discount);

      return await prisma.product.create({
        data: {
          name,
          price: bundlePrice,
          isBundle: true,
          bundleProducts: {
            create: products.map(p => ({
              quantity: p.quantity,
              productId: p.id
            }))
          }
        }
      });
    } catch (error) {
      throw new Error(`Failed to create bundle: ${error.message}`);
    }
  }

  static async applyPriceRule(
    productIds: string[],
    rule: PriceRule
  ): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        where: {
          id: {
            in: productIds
          }
        }
      });

      await prisma.$transaction(
        products.map(product => {
          const newPrice = rule.type === 'FIXED'
            ? rule.value
            : product.price * (1 - rule.value / 100);

          return prisma.product.update({
            where: { id: product.id },
            data: {
              price: newPrice,
              priceRules: {
                create: {
                  type: rule.type,
                  value: rule.value,
                  conditions: rule.conditions || {},
                  active: true
                }
              }
            }
          });
        })
      );

      // Clear cache for updated products
      await CacheService.clearNamespace('products');

      // Reindex products in search
      for (const product of products) {
        await SearchService.updateProduct(product);
      }
    } catch (error) {
      throw new Error(`Failed to apply price rule: ${error.message}`);
    }
  }

  static async syncInventory(): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        include: {
          variants: true
        }
      });

      for (const product of products) {
        const stockQuantity = product.variants.length
          ? product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
          : await InventoryService.getStockLevel(product.id);

        await prisma.product.update({
          where: { id: product.id },
          data: { stockQuantity }
        });

        // Update cache
        await CacheService.set(
          `product:${product.id}:stock`,
          stockQuantity,
          { namespace: 'inventory' }
        );
      }
    } catch (error) {
      throw new Error(`Inventory sync failed: ${error.message}`);
    }
  }

  static async generateVariants(
    productId: string,
    attributes: Record<string, string[]>
  ): Promise<Variant[]> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const combinations = this.generateAttributeCombinations(attributes);
      const variants: Variant[] = [];

      for (const combination of combinations) {
        const variant = await prisma.variant.create({
          data: {
            productId,
            name: Object.values(combination).join(' / '),
            sku: `${product.sku}-${Object.values(combination).join('-')}`,
            price: product.price,
            stockQuantity: 0,
            attributes: combination
          }
        });

        variants.push(variant);
      }

      return variants;
    } catch (error) {
      throw new Error(`Failed to generate variants: ${error.message}`);
    }
  }

  private static generateAttributeCombinations(
    attributes: Record<string, string[]>
  ): Record<string, string>[] {
    const keys = Object.keys(attributes);
    const combinations: Record<string, string>[] = [];

    const generate = (
      current: Record<string, string>,
      depth: number
    ) => {
      if (depth === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[depth];
      for (const value of attributes[key]) {
        current[key] = value;
        generate(current, depth + 1);
      }
    };

    generate({}, 0);
    return combinations;
  }
}