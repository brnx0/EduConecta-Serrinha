export const validateCpf = (cpf: string): boolean => {
  const cleanCpf = cpf.replace(/\D/g, ''); // Remove pontos e traços
  // Verifica se tem 11 dígitos ou se todos os números são iguais (ex: 111.111...)
  if (cleanCpf.length !== 11 || !!cleanCpf.match(/(\d)\1{10}/)) return false;

  const digits = cleanCpf.split('').map(el => +el);
  const rest = (count: number) => {
    return (
      ((digits
        .slice(0, count - 12)
        .reduce((soma, el, index) => soma + el * (count - index), 0) *
        10) %
        11) %
      10
    );
  };
  return rest(10) === digits[9] && rest(11) === digits[10];
};
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// DD/MM/AAAA que existe no calendário e não é futura. `new Date` rola
// 31/02 pra 02/03 sem erro, então confere se dia/mês/ano voltam iguais.
export const validateDataNascimento = (data: string): boolean => {
  const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [dia, mes, ano] = [+m[1], +m[2], +m[3]];
  const dt = new Date(ano, mes - 1, dia);
  const existe = dt.getFullYear() === ano && dt.getMonth() === mes - 1 && dt.getDate() === dia;
  return existe && ano >= 1900 && dt.getTime() <= Date.now();
};