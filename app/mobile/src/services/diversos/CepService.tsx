export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string;
  erro?: boolean; // ViaCEP retorna isso se não achar
}

export async function BuscarCep(cep: string): Promise<ViaCepResponse> {
  // 1. Remove tudo que não for número (traços, pontos, espaços)
  const cepLimpo = cep.replace(/\D/g, '');

  // 2. Validação básica de tamanho
  if (cepLimpo.length !== 8) {
    throw new Error('CEP inválido. Digite 8 números.');
  }

  try {
    // 3. Chamada à API
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    // 4. ViaCEP retorna status 200 mesmo se não achar, mas manda { erro: true }
    if (data.erro) {
      throw new Error('CEP não encontrado na base de dados.');
    }

    return data;
  } catch (error: any) {
    // Repassa o erro para a tela tratar
    throw new Error(error.message || 'Erro ao conectar com servidor de CEP.');
  }
}