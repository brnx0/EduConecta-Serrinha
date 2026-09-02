import fp from 'fastify-plugin';
import jwtPlugin from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Shape do JWT — mantém compatibilidade com mobile existente.
 * Mobile decodifica e lê: `usr_codigo`, `responsavel_nome`, `alunos`.
 *
 * `usr_codigo` é o id de Responsavel.id (autoincrement int).
 */
export interface AlunoTokenPayload {
  pes_cod: number;
  nome: string;
  cpf: string;
}

export interface AppJwtPayload {
  usr_codigo: number;
  cpf: string;
  responsavel_nome: string;
  alunos: AlunoTokenPayload[];
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AppJwtPayload;
    user: AppJwtPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(jwtPlugin, { secret: config.JWT_SECRET });

  app.decorate(
    'authenticate',
    async function (req: FastifyRequest, reply: FastifyReply) {
      try {
        await req.jwtVerify();
      } catch {
        reply.code(401).send({ error: 'unauthorized' });
      }
    }
  );
};

export default fp(authPlugin, { name: 'auth' });
