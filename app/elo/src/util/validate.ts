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