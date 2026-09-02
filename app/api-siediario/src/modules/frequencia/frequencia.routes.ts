import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { diasFrequencia, resumoFrequencia } from "./frequencia.service.js";

const anoQuery = z.object({
  pesCodAluno: z.coerce.number().int().positive(),
  ano: z.coerce.number().int().positive(),
});
const mesQuery = anoQuery.extend({ mes: z.coerce.number().int().min(1).max(12) });

function negarSeNaoVinculado(reply: FastifyReply, alunos: number[], pesCod: number): boolean {
  if (!alunos.includes(pesCod)) {
    reply.code(403).send({ error: "acesso_negado", message: "Aluno não vinculado a este responsável." });
    return true;
  }
  return false;
}

export async function frequenciaRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/frequencia/resumo", async (req, reply) => {
    const p = anoQuery.safeParse(req.query);
    if (!p.success) return reply.code(422).send({ error: "dados_invalidos", detalhes: p.error.flatten() });
    if (negarSeNaoVinculado(reply, req.user.alunos ?? [], p.data.pesCodAluno)) return;
    return reply.send(await resumoFrequencia(p.data.pesCodAluno, p.data.ano));
  });

  app.get("/frequencia/dias", async (req, reply) => {
    const p = mesQuery.safeParse(req.query);
    if (!p.success) return reply.code(422).send({ error: "dados_invalidos", detalhes: p.error.flatten() });
    if (negarSeNaoVinculado(reply, req.user.alunos ?? [], p.data.pesCodAluno)) return;
    return reply.send(await diasFrequencia(p.data.pesCodAluno, p.data.ano, p.data.mes));
  });
}
