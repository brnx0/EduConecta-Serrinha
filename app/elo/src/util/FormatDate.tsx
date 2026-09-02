// utils/DateUtils.ts

// --- INTERFACES ---
export interface DateData {
    dateString: string; // "2025-09-02"
    day: number;        // 2   
    month: number;      // 9
    year: number;       // 2025
    timestamp: number;  // timestamp da meia-noite local
}

// --- FUNÇÕES PRIVADAS (AJUDANTES) ---

/**
 * Converte 'YYYY-MM-DD' para Date seguramente, respeitando o fuso local.
 * Evita o erro de UTC que subtrai 1 dia.
 */
const parseLocalDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    const parts = dateString.split('-'); // [2025, 09, 02]
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS conta meses de 0 a 11
    const day = parseInt(parts[2], 10);

    return new Date(year, month, day);
};

// --- FUNÇÕES EXPORTADAS ---

/**
 * Retorna a data formatada por extenso em PT-BR.
 * Ex: "Terça-feira, 02 de setembro de 2025"
 */
export function formatDatePTBR(dateString: string): string {
    const dataObj = parseLocalDate(dateString);

    const formatador = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',  // "terça-feira"
        day: '2-digit',   // "02"
        month: 'long',    // "setembro"
        year: 'numeric'   // "2025"
    });

    const dataFormatada = formatador.format(dataObj);

    // Opcional: Capitalizar a primeira letra (pt-BR retorna minúsculo por padrão)
    return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}

/**
 * Retorna apenas o formato curto PT-BR.
 * Ex: "02/09/2025"
 */
export function formatDateShort(dateString: string): string {
    if (!dateString) return '';
    const [ano, mes, dia] = dateString.split('-');
    return `${dia}/${mes}/${ano}`;
}

/**
 * Retorna o objeto detalhado conforme sua interface.
 * Útil para cálculos ou lógica específica.
 */
export function getDateDetails(dateString: string): DateData {
    const dataObj = parseLocalDate(dateString);

    return {
        dateString: dateString,
        day: dataObj.getDate(),
        month: dataObj.getMonth() + 1, // Retornamos 1-12 (humano), não 0-11
        year: dataObj.getFullYear(),
        timestamp: dataObj.getTime()
    };
}

export function dateMask(value: string): string {
    // Remove qualquer caractere que não seja número
    const cleaned = value.replace(/\D/g, "");

    // Aplica a máscara progressivamente
    let formatted = cleaned;
    if (cleaned.length > 2) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    return formatted;
};


export const formatarDataBR = (dataString?: string | null): string => {
    if (!dataString) return '-';

    try {
        const dataLimpa = dataString.substring(0, 10);
        if (!dataLimpa.includes('-')) {
            return dataString;
        }
        const [ano, mes, dia] = dataLimpa.split('-');
        return `${dia}/${mes}/${ano}`;
    } catch (error) {
        return dataString || '-';
    }
};