import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';
import { getLegacyPool } from '../infra/legacyDb.js';

/**
 * Wrapper de envio de e-mail usando nodemailer (SMTP).
 *
 * Templates HTML são lidos da tabela legada `GER_PADRAO_EMAIL` (mantém
 * branding/ortografia configurada no Maker) — buscamos via `mssql` raw
 * porque a tabela é legada e não está no schema Prisma.
 *
 * Em DEV, se SMTP_HOST não estiver configurado, o conteúdo do e-mail é
 * logado no console (útil pra desenvolver sem depender de gateway real).
 */

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;
  if (!config.SMTP_HOST) {
    throw new Error('SMTP_HOST não configurado');
  }
  _transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth:
      config.SMTP_USER && config.SMTP_PASS
        ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
        : undefined,
  });
  return _transporter;
}

interface TemplateRow {
  ASSUNTO: string;
  HTML: string;
}

/**
 * Carrega template de `GER_PADRAO_EMAIL` por código (`EMA_COD`).
 * Códigos conhecidos:
 *   6 — Recuperação de senha (placeholder `$CODIGO`)
 */
async function carregarTemplate(emaCod: number): Promise<TemplateRow> {
  const pool = await getLegacyPool();
  const result = await pool
    .request()
    .input('cod', emaCod)
    .query<TemplateRow>(
      'SELECT EMA_ASSUNTO AS ASSUNTO, EMA_CONTEUDO AS HTML FROM GER_PADRAO_EMAIL WHERE EMA_COD = @cod'
    );
  if (!result.recordset.length) {
    throw new Error(`Template de e-mail EMA_COD=${emaCod} não encontrado`);
  }
  return result.recordset[0];
}

interface EnviarOpts {
  destinatario: string;
  assunto: string;
  html: string;
}

async function enviar({ destinatario, assunto, html }: EnviarOpts): Promise<void> {
  if (!config.SMTP_HOST) {
    if (config.NODE_ENV === 'production') {
      throw new Error('SMTP_HOST obrigatório em produção');
    }
    // DEV fallback — só loga
    // eslint-disable-next-line no-console
    console.log('[email:dev]', { destinatario, assunto, htmlPreview: html.slice(0, 200) });
    return;
  }
  await getTransporter().sendMail({
    from: config.SMTP_FROM ?? 'no-reply@localhost',
    to: destinatario,
    subject: assunto,
    html,
  });
}

/**
 * Envia e-mail de recuperação de senha com o código de 6 dígitos.
 * Template `EMA_COD=6` usa placeholder `$CODIGO`.
 */
export async function enviarEmailRecuperacaoSenha(
  destinatario: string,
  codigo: string
): Promise<void> {
  const tpl = await carregarTemplate(6);
  const html = tpl.HTML.split('$CODIGO').join(codigo);
  await enviar({ destinatario, assunto: tpl.ASSUNTO, html });
}
