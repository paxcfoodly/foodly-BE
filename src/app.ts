import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import healthRouter from './routes/health';
import v1Router from './routes/api/v1/index';

const app = express();

// ─── Security ───
app.use(
  helmet({
    contentSecurityPolicy: false, // allow Swagger UI inline scripts
  }),
);
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// ─── Body parsers ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───
app.use(requestLogger);

// ─── Swagger API docs ───
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'Foodly MES API Docs',
}));

// Swagger JSON endpoint for programmatic access
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Routes ───
app.use(healthRouter);
app.use('/api/v1', v1Router);

// ─── Error handling ───
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
