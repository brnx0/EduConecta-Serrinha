import argon2 from '@node-rs/argon2';
import { randomInt } from 'node:crypto';
import { prisma } from '../db.js';
import { enviarEmailRecuperacaoSenha } from '../lib/email.js';

/**
 * Janela de validade do reset token (em ms).
 * 10 min cobre fluxo normal + alguma margem pra usuário ler e-mail.
 */
const RESET_TTL_MS = 10 * 60 * 1000;

/**
 * Limite de tentativas de digitar o código antes de invalidar a sessão
 * de reset. Após o limite, `usedAt` é setado e o usuário precisa
 * solicitar um novo código.
 */
const MAX_TENTATIVAS = 3;

/**
 * Mascara e-mail pra exibição na UI: mostra até 5 chars antes do `@`,
 * ou só `****` se a parte local for curta. Compatível com a UX legada.
 */
export function mascararEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '****';
  const local = email.slice(0, at);
  const dominio = email.slice(at);
  if (local.length > 5) {
    return `${local.slice(0, 5)}****${dominio}`;
  }
  return `****${dominio}`;
}

function gerarCodigo(): string {
  // 6 dígitos uniformemente distribuídos. randomInt usa CSPRNG.
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export interface SolicitarResultadoOk {
  tipo: 'ok';
  resetId: string;
  emailMascarado: string;
}
export interface SolicitarResultadoSemEfeito {
  tipo: 'sem_efeito';
  emailMascarado: string;
}
export type SolicitarResultado = SolicitarResultadoOk | SolicitarResultadoSemEfeito;

/**
 * Cria solicitação de reset de senha:
 *   1. Busca responsável ativo pelo CPF.
 *   2. Se não existe (ou sem e-mail), retorna `sem_efeito` com e-mail
 *      mascarado fake — anti-enumeração.
 *   3. Se existe, gera código de 6 dígitos, persiste hash argon2id,
 *      envia e-mail e retorna `ok` com `resetId`.
 *
 * Importante: nem o código nem o `responsavelId` saem desta função
 * em texto claro. A rota assina um JWT com `resetId` e devolve só isso.
 */
export async function solicitar(cpf: string): Promise<SolicitarResultado> {
  const responsavel = await prisma.responsavel.findFirst({
    where: { cpf, ativo: true },
    select: { id: true, email: true },
  });

  if (!responsavel || !responsavel.email) {
    // Anti-enumeração: tempo gasto deve ser próximo do caso `ok`
    // (hash + insert + envio). Simulação simples: hash de string fake.
    await argon2.hash('decoy', { algorithm: argon2.Algorithm.Argon2id });
    return { tipo: 'sem_efeito', emailMascarado: '****@****' };
  }

  const codigo = gerarCodigo();
  const codeHash = await argon2.hash(codigo, {
    algorithm: argon2.Algorithm.Argon2id,
  });

  const reset = await prisma.passwordReset.create({
    data: {
      responsavelId: responsavel.id,
      codeHash,
      emailEnviado: responsavel.email,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
    select: { id: true },
  });

  await enviarEmailRecuperacaoSenha(responsavel.email, codigo);

  return {
    tipo: 'ok',
    resetId: reset.id,
    emailMascarado: mascararEmail(responsavel.email),
  };
}

export type ConfirmarResultado =
  | { tipo: 'ok' }
  | { tipo: 'token_invalido' }
  | { tipo: 'expirado' }
  | { tipo: 'codigo_invalido'; tentativasRestantes: number }
  | { tipo: 'tentativas_excedidas' };

/**
 * Confirma reset:
 *   1. Carrega PasswordReset por id.
 *   2. Valida não-usado, não-expirado, dentro do limite de tentativas.
 *   3. Verifica código com argon2.
 *   4. Atualiza senha em EDC_RESPONSAVEL e marca `usedAt`.
 */
export async function confirmar(
  resetId: string,
  codigo: string,
  novaSenha: string
): Promise<ConfirmarResultado> {
  const reset = await prisma.passwordReset.findUnique({
    where: { id: resetId },
  });

  if (!reset) return { tipo: 'token_invalido' };
  if (reset.usedAt) return { tipo: 'token_invalido' };
  if (reset.expiresAt.getTime() < Date.now()) return { tipo: 'expirado' };

  const ok = await argon2.verify(reset.codeHash, codigo);
  if (!ok) {
    const tentativas = reset.tentativas + 1;
    const restantes = MAX_TENTATIVAS - tentativas;
    if (restantes <= 0) {
      await prisma.passwordReset.update({
        where: { id: resetId },
        data: { tentativas, usedAt: new Date() },
      });
      return { tipo: 'tentativas_excedidas' };
    }
    await prisma.passwordReset.update({
      where: { id: resetId },
      data: { tentativas },
    });
    return { tipo: 'codigo_invalido', tentativasRestantes: restantes };
  }

  const senhaHash = await argon2.hash(novaSenha, {
    algorithm: argon2.Algorithm.Argon2id,
  });

  await prisma.$transaction([
    prisma.responsavel.update({
      where: { id: reset.responsavelId },
      data: { senhaHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetId },
      data: { usedAt: new Date() },
    }),
  ]);

  return { tipo: 'ok' };
}
