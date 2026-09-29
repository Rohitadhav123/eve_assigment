import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(` Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
