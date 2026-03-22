import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiters = new Map<string, RateLimitEntry>();

export function rateLimit(options: { windowMs: number; maxRequests: number; keyGenerator?: (c: Context) => string }) {
  const { windowMs, maxRequests, keyGenerator = (c: Context) => c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || c.env?.incoming?.socket?.remoteAddress || 'unknown' } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    let entry = limiters.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      limiters.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);

    c.res.headers.set('X-RateLimit-Limit', String(maxRequests));
    c.res.headers.set('X-RateLimit-Remaining', String(remaining));
    c.res.headers.set('X-RateLimit-Reset', String(resetIn));

    if (entry.count > maxRequests) {
      return c.json(
        { error: 'Too many requests', retryAfter: resetIn },
        429,
        {
          'Retry-After': String(resetIn),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetIn),
        }
      );
    }

    await next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limiters.entries()) {
    if (now > entry.resetAt + 60000) {
      limiters.delete(key);
    }
  }
}, 60000);
