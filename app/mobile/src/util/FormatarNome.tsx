export function normalizarNomePessoal(str: string | undefined): string {

    if (!str) return "";

    const lowerCaseStr = str.toLowerCase();

    const palavras = lowerCaseStr.split(' ');

    const palavrasCapitalizadas = palavras.map((palavra) => {
        if (palavra.length === 0) return '';

        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    });

    return palavrasCapitalizadas.join(' ');
}


export function normalizarNomeComExcecoes(str: string): string {
    const excecoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']; // Lista de palavras que devem ser minúsculas
    const lowerCaseStr = str.toLowerCase();

    return lowerCaseStr.split(' ')
        .map(palavra => {
            if (palavra.length === 0) return '';

            if (excecoes.includes(palavra)) {
                return palavra; // Retorna em minúsculo
            }

            return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        })
        .join(' ');
}
