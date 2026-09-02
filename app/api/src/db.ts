import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

export const prisma = new PrismaClient({
  log:
    config.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
});

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
