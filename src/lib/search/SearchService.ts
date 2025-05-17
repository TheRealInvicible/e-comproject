import { Client } from '@elastic/elasticsearch';
import { Product } from '@prisma/client';

interface SearchFilters {
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  brands?: string[];
  inStock?: boolean;
}

interface SearchResponse {
  hits: Product[];
  total: number;
  suggestions: string[];
}

export class SearchService {
  private static client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
  });

  static async search(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResponse> {
    const must: any[] = [
      {
        multi_match: {
          query,
          fields: ['name^3', 'description^2', 'category', 'tags'],
          fuzziness: 'AUTO'
        }
      }
    ];

    // Apply filters
    if (filters.category) {
      must.push({ term: { 'category.keyword': filters.category } });
    }

    if (filters.priceRange) {
      must.push({
        range: {
          price: {
            gte: filters.priceRange.min,
            lte: filters.priceRange.max
          }
        }
      });
    }

    if (filters.brands?.length) {
      must.push({ terms: { 'brand.keyword': filters.brands } });
    }

    if (filters.inStock !== undefined) {
      must.push({ term: { inStock: filters.inStock } });
    }

    const { body } = await this.client.search({
      index: 'products',
      body: {
        from: (page - 1) * limit,
        size: limit,
        query: {
          bool: { must }
        },
        aggs: {
          categories: {
            terms: { field: 'category.keyword' }
          },
          brands: {
            terms: { field: 'brand.keyword' }
          },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { to: 1000 },
                { from: 1000, to: 5000 },
                { from: 5000, to: 10000 },
                { from: 10000 }
              ]
            }
          }
        },
        suggest: {
          text: query,
          suggestions: {
            term: {
              field: 'name',
              suggest_mode: 'always'
            }
          }
        }
      }
    });

    return {
      hits: body.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score
      })),
      total: body.hits.total.value,
      suggestions: body.suggest.suggestions[0].options.map(
        (option: any) => option.text
      )
    };
  }

  static async indexProduct(product: Product): Promise<void> {
    await this.client.index({
      index: 'products',
      id: product.id,
      body: product
    });
  }

  static async deleteProduct(productId: string): Promise<void> {
    await this.client.delete({
      index: 'products',
      id: productId
    });
  }

  static async updateProduct(product: Product): Promise<void> {
    await this.client.update({
      index: 'products',
      id: product.id,
      body: {
        doc: product
      }
    });
  }

  static async getSuggestions(query: string): Promise<string[]> {
    const { body } = await this.client.search({
      index: 'products',
      body: {
        suggest: {
          suggestions: {
            prefix: query,
            completion: {
              field: 'name_suggest',
              size: 5,
              fuzzy: {
                fuzziness: 'AUTO'
              }
            }
          }
        }
      }
    });

    return body.suggest.suggestions[0].options.map(
      (option: any) => option.text
    );
  }
}