import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║  MES API Server                           ║
  ║  Port:        ${String(env.PORT).padEnd(28)}║
  ║  Environment: ${env.NODE_ENV.padEnd(28)}║
  ║  Health:      http://localhost:${env.PORT}/health  ║
  ╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
