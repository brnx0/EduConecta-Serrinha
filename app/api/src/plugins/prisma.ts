import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { prisma, disconnectDb } from '../db.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await disconnectDb();
  });
};

export default fp(prismaPlugin, { name: 'prisma' });
