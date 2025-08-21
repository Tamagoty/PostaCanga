// path: src/hooks/useCep.js
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook customizado para buscar um endereço a partir de um CEP usando a API ViaCEP.
 * @param {function} onSuccess - Callback a ser executado quando a busca for bem-sucedida. Recebe os dados do endereço como argumento.
 */
export const useCep = (onSuccess) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const triggerCepFetch = useCallback(async (currentCep) => {
    const cleanedCep = currentCep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado.');
      }

      // Executa o callback de sucesso, passando os dados do CEP
      if (onSuccess) {
        onSuccess(data);
      }
      
    } catch (err) {
      toast.error(err.message || 'Erro ao buscar CEP.');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess]);

  return { isCepLoading: isLoading, cepError: error, triggerCepFetch };
};
