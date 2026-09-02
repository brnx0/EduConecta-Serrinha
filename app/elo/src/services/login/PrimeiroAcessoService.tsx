import { apiNotifications } from "../apiNotifications";

/**
 * Converte data DD/MM/YYYY (input do mobile) → ISO YYYY-MM-DD (esperado pela nova API).
 */
function ddmmyyyyToIso(s: string): string {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) throw new Error('Data deve estar no formato DD/MM/AAAA');
    return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Mapeia erros estruturados da nova API ({ error, message }) em mensagens
 * de UI. Mantém a mesma UX do legado (status codes 201/202 viraram
 * 409/422 com `error` no body).
 */
function mensagemErroValidar(error: any): string {
    const status = error?.response?.status;
    const code = error?.response?.data?.error;

    if (status === 409 || code === 'ja_cadastrado') {
        return "Este CPF já possui cadastro. Utilize a opção 'Esqueci a Senha'.";
    }
    if (status === 422 || code === 'dados_nao_conferem') {
        return "Dados não conferem com o cadastro escolar. Verifique as informações ou entre em contato com a escola.";
    }
    if (status === 400) {
        return error?.response?.data?.message || "Dados inválidos. Verifique os campos preenchidos.";
    }
    if (status === 500 || !error?.response) {
        return "Falha ao conectar com o servidor. Tente novamente.";
    }
    return error?.message || "Resposta inesperada do servidor.";
}

export async function ValidarPrimeiroAcesso(
    cpf_responsavel: string,
    cpf_aluno: string,
    dt_nascimento_aluno: string, // DD/MM/YYYY (vem do input do mobile)
    email: string
) {
    try {
        const response = await apiNotifications.post('/auth/primeiro-acesso/validar', {
            cpfResponsavel: cpf_responsavel,
            cpfAluno: cpf_aluno,
            dataNascimentoAluno: ddmmyyyyToIso(dt_nascimento_aluno),
            email,
        });
        return response.data; // { alunoPesCod, nomeAluno }
    } catch (error: any) {
        throw new Error(mensagemErroValidar(error));
    }
}

export async function CriarUsuario(cpf_responsavel: string, senha: string, email: string) {
    try {
        const response = await apiNotifications.post('/auth/primeiro-acesso/criar', {
            cpfResponsavel: cpf_responsavel,
            senha,
            email,
        });
        return response.data; // { id, cpf, email, alunosVinculados }
    } catch (error: any) {
        const status = error?.response?.status;
        const code = error?.response?.data?.error;

        if (status === 409 || code === 'ja_cadastrado') {
            throw new Error("Este CPF ou e-mail já possui cadastro.");
        }
        if (status === 400) {
            throw new Error(error?.response?.data?.message || "Dados inválidos. Verifique os campos.");
        }
        throw new Error('Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente mais tarde.');
    }
}
