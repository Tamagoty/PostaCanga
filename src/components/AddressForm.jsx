// path: src/components/AddressForm.jsx
// VERSÃO 3: Corrigido o handleSubmit para enviar um payload com nomes de parâmetros
// que correspondem exatamente à função SQL, resolvendo o erro de "função não encontrada".

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CustomerForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';
import useDebounce from '../hooks/useDebounce';
import { maskCEP } from '../utils/masks';

const AddressForm = ({ onSave, onClose, addressToEdit, loading, initialCep }) => {
  const initialFormData = { cep: initialCep || '', street_name: '', neighborhood: '', city_id: '' };
  const [formData, setFormData] = useState(initialFormData);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const debouncedCep = useDebounce(formData.cep, 500);

  const autoFetchAddress = useCallback(async () => {
    const cleanedCep = debouncedCep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast.error('CEP não encontrado.');
      } else {
        const { data: stateData, error: stateError } = await supabase
          .from('states')
          .select('id')
          .eq('uf', data.uf)
          .single();

        if (stateError || !stateData) {
            toast.error(`O estado "${data.uf}" não foi encontrado na nossa base de dados.`);
            return;
        }
        
        setSelectedState(stateData.id);
        
        const { data: cityData, error: cityError } = await supabase
            .from('cities')
            .select('id')
            .eq('state_id', stateData.id)
            .ilike('name', data.localidade)
            .single();

        if(cityError || !cityData) {
            toast.error(`A cidade "${data.localidade}" não foi encontrada para o estado ${data.uf}.`);
            setFormData(prev => ({ ...prev, street_name: data.logradouro, neighborhood: data.bairro, city_id: '' }));
        } else {
            setFormData(prev => ({
              ...prev,
              street_name: data.logradouro,
              neighborhood: data.bairro,
              city_id: cityData.id
            }));
            toast.success('Endereço preenchido!');
        }
      }
    } catch (error) {
      toast.error('Falha ao buscar o CEP. Verifique a sua conexão.');
    } finally {
      setCepLoading(false);
    }
  }, [debouncedCep]);

  useEffect(() => {
    if(debouncedCep) {
        autoFetchAddress();
    }
  }, [debouncedCep, autoFetchAddress]);

  useEffect(() => {
    supabase.from('states').select('*').order('uf').then(({ data, error }) => {
        if(error) toast.error(handleSupabaseError(error));
        else setStates(data || []);
    });
  }, []);

  useEffect(() => {
    if (selectedState) {
      supabase.from('cities').select('*').eq('state_id', selectedState).order('name').then(({ data, error }) => {
          if(error) toast.error(handleSupabaseError(error));
          else setCities(data || []);
      });
    } else {
      setCities([]);
    }
  }, [selectedState]);

  useEffect(() => {
    if (addressToEdit && addressToEdit.city_id) {
      supabase.from('cities').select('*, states(*)').eq('id', addressToEdit.city_id).single().then(({data, error}) => {
        if(error) toast.error(handleSupabaseError(error));
        else if (data) {
          setSelectedState(data.states.id);
          setFormData({
            cep: addressToEdit.cep || '', street_name: addressToEdit.street_name || '',
            neighborhood: addressToEdit.neighborhood || '', city_id: addressToEdit.city_id
          });
        }
      });
    } else {
      setFormData(initialFormData);
    }
  }, [addressToEdit, initialCep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'cep' ? maskCEP(value) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setFormData(prev => ({ ...prev, city_id: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.street_name || !formData.city_id) {
      toast.error('Logradouro e Cidade são obrigatórios.');
      return;
    }
    // ALTERAÇÃO: Criar um payload com nomes de parâmetros exatos para a função RPC.
    const payload = {
          p_address_id: addressToEdit?.id || null,
          p_cep: formData.cep,
          p_street_name: formData.street_name,
          p_neighborhood: formData.neighborhood,
          p_city_id: parseInt(formData.city_id, 10)
        };
        onSave(payload);
    };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes do Endereço</legend>
        <div className={styles.cepGroup}>
          <Input id="cep" name="cep" label="CEP" value={formData.cep} onChange={handleChange} maxLength="9" />
          {cepLoading && <div className={styles.loader}></div>}
        </div>
        <Input id="street_name" name="street_name" label="Logradouro (Ex: Rua das Flores)" value={formData.street_name} onChange={handleChange} required />
        <Input id="neighborhood" name="neighborhood" label="Bairro" value={formData.neighborhood} onChange={handleChange} />
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label htmlFor="state">Estado</label>
            <select id="state" value={selectedState} onChange={handleStateChange} className={styles.select}>
              <option value="">Selecione um Estado</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.uf}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="city_id">Cidade</label>
            <select id="city_id" name="city_id" value={formData.city_id} onChange={handleChange} className={styles.select} disabled={!selectedState} required>
              <option value="">Selecione uma Cidade</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>{loading ? 'A Guardar...' : 'Guardar Endereço'}</Button>
      </div>
    </form>
  );
};

export default AddressForm;
