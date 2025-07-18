// Arquivo: src/hooks/useDebounce.js
// DESCRIÇÃO: Hook customizado para adicionar "debounce" a um valor.
//            Isso atrasa a atualização de um valor (ex: termo de busca),
//            o que é útil para evitar re-renderizações excessivas a cada tecla digitada.

import { useState, useEffect } from 'react';

function useDebounce(value, delay) {
  // Estado para armazenar o valor com debounce
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura um timer para atualizar o valor do debounce
    // somente após o tempo de 'delay' ter passado sem alterações.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Função de limpeza: cancela o timer se o valor mudar
    // antes do delay terminar. Isso reinicia o processo.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // O efeito só roda novamente se o valor ou o delay mudarem

  return debouncedValue;
}

export default useDebounce;
