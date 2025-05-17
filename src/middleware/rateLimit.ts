import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CacheService } from '@/lib/cache/CacheService';

export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  keyGenerator?: (req: NextRequest) => string;
}

const defaultKeyGenerator = (req: NextRequest) => {
  return `ratelimit:${req.ip}:${req.nextUrl.pathname}`;
};

export function rateLimit(config: RateLimitConfig) {
  return async function middleware(
    request: NextRequest
  ) {
    const key = (config.keyGenerator || defaultKeyGenerator)(request);
    
    const isAllowed = await CacheService.checkRateLimit(
      key,
      config.limit,
      config.window
    );

    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please try again later'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': config.window.toString()
          }
        }
      );
    }

    return NextResponse.next();
  };
}

// Usage example:
export const apiRateLimit = rateLimit({
  limit: 100,
  window: 60 * 15, // 15 minutes
  keyGenerator: (req) => `ratelimit:${req.ip}:api`
});

export const authRateLimit = rateLimit({
  limit: 5,
  window: 60 * 15, // 15 minutes
  keyGenerator: (req) => `ratelimit:${req.ip}:auth`
});