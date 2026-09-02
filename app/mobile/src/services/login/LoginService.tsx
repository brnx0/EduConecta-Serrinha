import { apiNotifications } from '../apiNotifications';

interface LoginResponse {
    token: string;
}

/**
 * Login no novo backend (app/api). JWT shape compatível com mobile:
 * { usr_codigo, responsavel_nome, alunos: [{pes_cod, nome, cpf}], iat, exp }
 *
 * Mapeamento de erros:
 *   401 credenciais_invalidas    → "CPF e/ou senha incorretos"
 *   403 inativo                  → mensagem explícita
 *   422 primeiro_acesso_pendente → oferece cadastro
 *   422 sem_alunos               → sem aluno vinculado
 */
export async function Autenticar(cpf: string, senha: string): Promise<LoginResponse> {
    try {
        const response = await apiNotifications.post<LoginResponse>('/auth/login', {
            cpf,
            senha,
        });
        return response.data;
    } catch (error: any) {
        if (error?.response) {
            const status = error.response.status;
            const code = error.response.data?.error;
            const msg = error.response.data?.message;

            if (status === 401 || code === 'credenciais_invalidas') {
                throw new Error('CPF e/ou senha incorretos.');
            }
            if (status === 403 || code === 'inativo') {
                throw new Error(msg || 'Seu usuário encontra-se inativo, entre em contato com a escola.');
            }
            if (code === 'primeiro_acesso_pendente') {
                throw new Error('CPF não cadastrado, deseja realizar o cadastro agora?.');
            }
            if (code === 'sem_alunos') {
                throw new Error('Seu usuário não possui aluno(s) vinculado(s), entre em contato com a escola.');
            }
            if (status === 400) {
                throw new Error(msg || 'Dados inválidos. Verifique CPF e senha.');
            }
            if (status >= 500) {
                throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
            }
        }

        if (error?.code === 'ECONNABORTED') {
            throw new Error('O servidor demorou muito para responder. Verifique sua conexão.');
        }
        if (!error?.response) {
            throw new Error('Falha de conexão com a internet.');
        }

        throw new Error(error?.message || 'Não foi possível realizar o login. Tente novamente.');
    }
}
