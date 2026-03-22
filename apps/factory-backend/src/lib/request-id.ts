import type { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';

export async function requestId(c: Context, next: Next) {
  const id = c.req.header('x-request-id') || uuidv4();
  c.set('requestId', id);
  c.res.headers.set('X-Request-Id', id);
  await next();
}

export function logger() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const requestId = c.get('requestId') || 'unknown';
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    const logData = {
      requestId,
      method,
      path,
      status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      console.error('[ERROR]', JSON.stringify(logData));
    } else if (status >= 400) {
      console.warn('[WARN]', JSON.stringify(logData));
    } else {
      console.log('[INFO]', JSON.stringify(logData));
    }
  };
}
