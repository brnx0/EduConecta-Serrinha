

export default function maskCpf(value: string): string {
    return value
        .replace(/\D/g, "") // Remove tudo o que não é dígito
        .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após os 3 primeiros dígitos
        .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após os 6 primeiros dígitos
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2") // Coloca hífen antes dos últimos 2 dígitos
        .slice(0, 14); // Garante o limite de caracteres da máscara
};


export function maskTel (value: string): string {
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, "");
  
  // Limita a 11 dígitos (DDD + 9 números)
  const limited = cleaned.slice(0, 11);

  let formatted = limited;

  if (limited.length > 0) {
    formatted = `(${limited.slice(0, 2)}`;
  }
  if (limited.length > 2) {
    formatted = `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }
  if (limited.length > 6) {
    // Se tiver mais de 10 dígitos (DDD + 8 ou 9), ajusta o hífen
    if (limited.length <= 10) {
      // Fixo: (11) 4444-4444
      formatted = `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      // Celular: (11) 99999-9999
      formatted = `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  }

  return formatted;
};


