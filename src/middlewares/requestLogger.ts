import morgan from 'morgan';
import { env } from '../config/env';

// Development: colored, concise
// Production: Apache combined format for log aggregation
const format = env.isDev ? 'dev' : 'combined';

export const requestLogger = morgan(format, {
  skip: (_req, res) => {
    // In production, skip successful health checks to reduce noise
    if (env.isProd && _req.url === '/health' && res.statusCode < 400) {
      return true;
    }
    return false;
  },
});
