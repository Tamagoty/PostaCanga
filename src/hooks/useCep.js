// path: src/hooks/useCep.js
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useCep = (setFormData) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // A função foi envolvida com useCallback para evitar recriações desnecessárias,
  // o que corrigiu o loop que causava a "chuva de toasts".
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

      setFormData(prev => ({
        ...prev,
        street_name: data.logradouro,
        neighborhood: data.bairro,
        city_name: data.localidade,
        state_uf: data.uf,
      }));
      toast.success('Endereço preenchido automaticamente!');
      
    } catch (err) {
      toast.error(err.message || 'Erro ao buscar CEP.');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [setFormData]);

  return { isCepLoading: isLoading, cepError: error, triggerCepFetch };
};
