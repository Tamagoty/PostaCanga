// path: src/utils/masks.js
// DESCRIÇÃO: Funções utilitárias para aplicar máscaras de formatação em campos de formulário.

/**
 * Aplica a máscara de CPF (###.###.###-##)
 * @param {string} value O valor do input.
 * @returns {string} O valor com a máscara aplicada.
 */
export const maskCPF = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o sexto e o sétimo dígitos
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o nono e o décimo dígitos
    .substring(0, 14); // Limita o tamanho
};

/**
 * Aplica a máscara de Telemóvel ((##) #.####-####) de forma progressiva.
 * @param {string} value O valor do input.
 * @returns {string} O valor com a máscara aplicada.
 */
export const maskPhone = (value) => {
  if (!value) return "";
  const digitsOnly = value.replace(/\D/g, '');
  const truncatedDigits = digitsOnly.substring(0, 11);
  let formattedValue = truncatedDigits;

  if (truncatedDigits.length > 7) {
    formattedValue = `(${truncatedDigits.substring(0, 2)}) ${truncatedDigits.substring(2, 3)}.${truncatedDigits.substring(3, 7)}-${truncatedDigits.substring(7, 11)}`;
  } else if (truncatedDigits.length > 3) {
    formattedValue = `(${truncatedDigits.substring(0, 2)}) ${truncatedDigits.substring(2, 3)}.${truncatedDigits.substring(3, 7)}`;
  } else if (truncatedDigits.length > 2) {
    formattedValue = `(${truncatedDigits.substring(0, 2)}) ${truncatedDigits.substring(2, 3)}`;
  } else if (truncatedDigits.length > 0) {
    formattedValue = `(${truncatedDigits}`;
  }

  return formattedValue;
};

/**
 * Aplica a máscara de CEP (XXXXX-XXX) para inputs de formulário.
 * @param {string} value O valor do input.
 * @returns {string} O valor com a máscara aplicada.
 */
export const maskCEP = (value) => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  return value.slice(0, 9);
};

/**
 * Formata um CEP (apenas dígitos) para o formato de exibição XX.XXX-XXX.
 * @param {string} cep O CEP contendo apenas dígitos.
 * @returns {string} O CEP formatado.
 */
export const formatCEP = (cep) => {
  if (!cep) return "";
  const cleanedCep = cep.replace(/\D/g, '');
  if (cleanedCep.length !== 8) return cep; // Retorna o valor original se não for um CEP completo
  return cleanedCep.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2-$3');
};
