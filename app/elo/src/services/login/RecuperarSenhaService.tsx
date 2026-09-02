import { apiNotifications } from '../apiNotifications';

interface SolicitarRecuperacaoResponse {
    emailMascarado: string;
    resetToken: string;
}

interface CodigoInvalidoError {
    error: 'codigo_invalido';
    message: string;
    tentativasRestantes: number;
}

interface ConfirmarSucessoResponse {
    ok: true;
}

/**
 * Solicita envio do código de recuperação por e-mail.
 *
 * Sempre 200 (anti-enumeração). Mesmo que o CPF não esteja cadastrado,
 * o backend devolve um `resetToken` falso. A confirmação subsequente
 * falhará com `token_invalido` — nunca expomos a existência do CPF.
 */
export async function solicitarRecuperacaoSenha(cpf: string): Promise<SolicitarRecuperacaoResponse> {
    try {
        const response = await apiNotifications.post<SolicitarRecuperacaoResponse>(
            '/auth/recuperar-senha',
            { cpf }
        );
        return response.data;
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 500) {
            throw new Error('Não foi possível enviar o e-mail. Tente novamente.');
        }
        throw new Error(error.response?.data?.message || 'Erro ao solicitar recuperação de senha.');
    }
}

interface ConfirmarRecuperacaoParams {
    resetToken: string;
    codigo: string;
    novaSenha: string;
}

export interface ConfirmarRecuperacaoResultado {
    ok: boolean;
    erro?: 'token_invalido' | 'codigo_invalido' | 'tentativas_excedidas' | 'expirado';
    mensagem?: string;
    tentativasRestantes?: number;
}

/**
 * Confirma reset enviando código + nova senha.
 *
 * Mapeia respostas HTTP do backend para um shape único pra UI tratar.
 * Não lança em fluxos esperados (token inválido, código errado, expirado);
 * só lança em erro de rede/servidor.
 */
export async function confirmarRecuperacaoSenha(
    params: ConfirmarRecuperacaoParams
): Promise<ConfirmarRecuperacaoResultado> {
    try {
        const response = await apiNotifications.post<ConfirmarSucessoResponse>(
            '/auth/recuperar-senha/confirmar',
            params
        );
        return { ok: response.data.ok === true };
    } catch (error: any) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401 || status === 410) {
            const erro = data?.error as ConfirmarRecuperacaoResultado['erro'];
            const tentativasRestantes =
                erro === 'codigo_invalido'
                    ? (data as CodigoInvalidoError | undefined)?.tentativasRestantes
                    : undefined;
            return {
                ok: false,
                erro,
                mensagem: data?.message,
                tentativasRestantes,
            };
        }

        throw new Error(data?.message || error.message || 'Erro ao confirmar nova senha.');
    }
}
