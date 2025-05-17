import { redis } from '../redis';

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

export class CacheService {
  private static readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  static async get<T>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.getFullKey(key, namespace);
    const data = await redis.get(fullKey);
    return data ? JSON.parse(data) : null;
  }

  static async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.getFullKey(key, options.namespace);
    const ttl = options.ttl || this.DEFAULT_TTL;

    await redis.set(
      fullKey,
      JSON.stringify(value),
      'EX',
      ttl
    );
  }

  static async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.getFullKey(key, namespace);
    await redis.del(fullKey);
  }

  static async clearNamespace(namespace: string): Promise<void> {
    const pattern = this.getFullKey('*', namespace);
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  static async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options.namespace);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }

  static async increment(
    key: string,
    namespace?: string,
    amount: number = 1
  ): Promise<number> {
    const fullKey = this.getFullKey(key, namespace);
    return redis.incrby(fullKey, amount);
  }

  static async decrement(
    key: string,
    namespace?: string,
    amount: number = 1
  ): Promise<number> {
    const fullKey = this.getFullKey(key, namespace);
    return redis.decrby(fullKey, amount);
  }

  static async setHash(
    key: string,
    field: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.getFullKey(key, options.namespace);
    await redis.hset(fullKey, field, JSON.stringify(value));
    if (options.ttl) {
      await redis.expire(fullKey, options.ttl);
    }
  }

  static async getHash(
    key: string,
    field: string,
    namespace?: string
  ): Promise<any> {
    const fullKey = this.getFullKey(key, namespace);
    const value = await redis.hget(fullKey, field);
    return value ? JSON.parse(value) : null;
  }

  static async getAllHash(
    key: string,
    namespace?: string
  ): Promise<Record<string, any>> {
    const fullKey = this.getFullKey(key, namespace);
    const data = await redis.hgetall(fullKey);
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, JSON.parse(v)])
    );
  }

  private static getFullKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  // Rate limiting methods
  static async checkRateLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const current = await this.increment(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }

    return current <= limit;
  }

  // Locking methods
  static async acquireLock(
    key: string,
    ttl: number
  ): Promise<string | null> {
    const token = Math.random().toString(36).substring(2);
    const acquired = await redis.set(
      `lock:${key}`,
      token,
      'NX',
      'EX',
      ttl
    );

    return acquired ? token : null;
  }

  static async releaseLock(
    key: string,
    token: string
  ): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(
      script,
      1,
      `lock:${key}`,
      token
    );

    return result === 1;
  }
}