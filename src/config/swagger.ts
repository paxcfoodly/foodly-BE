import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Foodly MES API',
      version: '1.0.0',
      description:
        '식품 제조 실행 시스템(MES) REST API — 생산관리, 품질관리, 재고관리, 설비관리 등',
      contact: {
        name: 'Foodly Dev Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', nullable: true },
            error: { type: 'string', nullable: true, example: null },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            data: { type: 'object', nullable: true, example: null },
            error: { type: 'string', example: 'Error message' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            uptime: { type: 'integer', example: 120 },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string', example: 'development' },
            database: { type: 'string', enum: ['connected', 'disconnected'] },
            memory: {
              type: 'object',
              properties: {
                rss: { type: 'string', example: '45MB' },
                heapUsed: { type: 'string', example: '22MB' },
              },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
