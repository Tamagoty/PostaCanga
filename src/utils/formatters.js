// path: src/utils/formatters.js
/**
 * Capitaliza nomes próprios, ignorando conectivos comuns.
 * Ex: "JOÃO DA SILVA" se torna "João da Silva".
 * @param {string} str A string de entrada.
 * @returns {string} A string formatada.
 */
export const capitalizeName = (str) => {
  if (!str) return '';
  const exceptions = ['de', 'da', 'das', 'do', 'dos'];
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (exceptions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};
