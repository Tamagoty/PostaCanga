// Arquivo: src/utils/masks.js
// DESCRIÇÃO: Funções utilitárias para aplicar máscaras de formatação em campos de formulário.

// Aplica a máscara de CPF (###.###.###-##)
export const maskCPF = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o sexto e o sétimo dígitos
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o nono e o décimo dígitos
    .substring(0, 14); // Limita o tamanho
};

// Aplica a máscara de Telemóvel ((##) #.####-####)
export const maskPhone = (value) => {
  if (!value) return "";
  // Limpa o valor, deixando apenas os dígitos
  const digitsOnly = value.replace(/\D/g, '');

  // Limita a 11 dígitos (DDD + 9 dígitos do telemóvel)
  const truncatedDigits = digitsOnly.substring(0, 11);

  let formattedValue = truncatedDigits;

  if (truncatedDigits.length > 7) {
    // Formato completo ou parcial: (XX) X.XXXX-XXXX
    formattedValue = `(${truncatedDigits.substring(0, 2)}) ${truncatedDigits.substring(2, 3)}.${truncatedDigits.substring(3, 7)}-${truncatedDigits.substring(7, 11)}`;
  } else if (truncatedDigits.length > 3) {
    // Formato parcial: (XX) X.XXXX
    formattedValue = `(${truncatedDigits.substring(0, 2)}) ${truncatedDigits.substring(2, 3)}.${truncatedDigits.substring(3, 7)}`;
  } else if (truncatedDigits.length > 2) {
    // Formato parcial: (XX) X
    formattedValue = `(${truncatedDigits.substring(0, 2)}) ${truncatedDigits.substring(2, 3)}`;
  } else if (truncatedDigits.length > 0) {
    // Formato parcial: (XX
    formattedValue = `(${truncatedDigits}`;
  }

  return formattedValue;
};
