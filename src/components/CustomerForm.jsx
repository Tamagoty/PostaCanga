// path: src/components/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './CustomerForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';
import { maskCPF, maskPhone, maskCEP } from '../utils/masks';
import { capitalizeName } from '../utils/formatters';
import { useCep } from '../hooks/useCep';
import useDebounce from '../hooks/useDebounce';

const CustomerForm = ({ onSave, onClose, customerToEdit, loading }) => {
  const [formData, setFormData] = useState({
    full_name: '', cpf: '', cellphone: '', email: '', birth_date: '',
    contact_customer_id: null, address_id: null, address_number: '',
    address_complement: '', cep: '', street_name: '', neighborhood: '',
    city_name: '', state_uf: ''
  });

  const [contactSearch, setContactSearch] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);

  const debouncedContactSearch = useDebounce(contactSearch, 500);
  const debouncedAddressSearch = useDebounce(addressSearch, 500);
  const debouncedCep = useDebounce(formData.cep, 800);

  const { isCepLoading, triggerCepFetch } = useCep(setFormData);

  useEffect(() => {
    if (customerToEdit) {
      const initialAddress = customerToEdit.address 
        ? `${customerToEdit.address.street_name} (${customerToEdit.address.neighborhood}) ${customerToEdit.address.city}`
        : '';
      setAddressSearch(initialAddress);

      setFormData({
        full_name: customerToEdit.full_name || '',
        cpf: customerToEdit.cpf || '',
        cellphone: customerToEdit.cellphone || '',
        email: customerToEdit.email || '',
        birth_date: customerToEdit.birth_date || '',
        contact_customer_id: customerToEdit.contact_customer_id || null,
        address_id: customerToEdit.address_id || null,
        address_number: customerToEdit.address_number || '',
        address_complement: customerToEdit.address_complement || '',
        cep: customerToEdit.address?.cep || '',
        street_name: customerToEdit.address?.street_name || '',
        neighborhood: customerToEdit.address?.neighborhood || '',
        city_name: customerToEdit.address?.city || '',
        state_uf: customerToEdit.address?.state || ''
      });
      if (customerToEdit.contact_full_name) {
        setContactSearch(customerToEdit.contact_full_name);
      }
    }
  }, [customerToEdit]);

  useEffect(() => {
    const getContactSuggestions = async () => {
      if (debouncedContactSearch.length < 3) {
        setContactSuggestions([]);
        return;
      }
      const { data, error } = await supabase.rpc('search_contacts', { p_search_term: debouncedContactSearch });
      if (error) {
        console.error(error);
        setContactSuggestions([]);
      } else {
        setContactSuggestions(data || []);
      }
    };
    getContactSuggestions();
  }, [debouncedContactSearch]);
  
  useEffect(() => {
    const getAddressSuggestions = async () => {
        if (debouncedAddressSearch.length < 3 || formData.cep) {
            setAddressSuggestions([]);
            return;
        }
        // NOTE: A função 'search_addresses' precisa ser criada no Supabase
        const { data, error } = await supabase.rpc('search_addresses', { p_search_term: debouncedAddressSearch });
        if (error) {
            console.error(error);
            setAddressSuggestions([]);
        } else {
            setAddressSuggestions(data || []);
        }
    };
    getAddressSuggestions();
  }, [debouncedAddressSearch, formData.cep]);

  useEffect(() => {
    if (debouncedCep.replace(/\D/g, '').length === 8) {
      triggerCepFetch(debouncedCep);
    }
  }, [debouncedCep, triggerCepFetch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let maskedValue = value;
    if (name === 'cpf') maskedValue = maskCPF(value);
    if (name === 'cellphone') maskedValue = maskPhone(value);
    if (name === 'cep') maskedValue = maskCEP(value);
    setFormData(prev => ({ ...prev, [name]: maskedValue }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'full_name' || name === 'street_name' || name === 'neighborhood' || name === 'city_name') {
        setFormData(prev => ({ ...prev, [name]: capitalizeName(value) }));
    }
  };

  const handleSelectContact = (suggestion) => {
    setFormData(prev => ({ ...prev, contact_customer_id: suggestion.id }));
    setContactSearch(suggestion.full_name);
    setContactSuggestions([]);
  };
  
  const handleSelectAddress = (address) => {
    setFormData(prev => ({
        ...prev,
        address_id: address.id,
        cep: address.cep,
        street_name: address.street_name,
        neighborhood: address.neighborhood,
        city_name: address.city_name,
        state_uf: address.state_uf,
    }));
    setAddressSearch(`${address.street_name} (${address.neighborhood}) ${address.city_name}`);
    setAddressSuggestions([]);
  };

  const handleClearContact = () => {
    setFormData(prev => ({ ...prev, contact_customer_id: null }));
    setContactSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast.error('O Nome Completo é obrigatório.');
      return;
    }

    let finalAddressId = formData.address_id;

    if (formData.street_name && formData.city_name && formData.state_uf) {
        try {
            const { data: cityData, error: cityError } = await supabase
                .from('cities')
                .select('id, states!inner(uf)')
                .eq('name', formData.city_name)
                .eq('states.uf', formData.state_uf.toUpperCase())
                .single();

            if (cityError || !cityData) {
                toast.error('Cidade/UF não encontrada. Verifique os dados do endereço.');
                return;
            }

            const { data: addressData, error: addressError } = await supabase.rpc('create_or_update_address', {
                p_address_id: formData.address_id,
                p_cep: formData.cep,
                p_street_name: formData.street_name,
                p_neighborhood: formData.neighborhood,
                p_city_id: cityData.id
            });

            if (addressError) throw addressError;
            finalAddressId = addressData.id;

        } catch (error) {
            toast.error(handleSupabaseError(error));
            return;
        }
    }

    const payload = {
      p_customer_id: customerToEdit?.id || null,
      p_full_name: formData.full_name,
      p_cpf: formData.cpf,
      p_cellphone: formData.cellphone,
      p_birth_date: formData.birth_date || null,
      p_contact_customer_id: formData.contact_customer_id,
      p_email: formData.email,
      p_address_id: finalAddressId,
      p_address_number: formData.address_number,
      p_address_complement: formData.address_complement,
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados Pessoais</legend>
        <Input id="full_name" name="full_name" label="Nome Completo" value={formData.full_name} onChange={handleChange} onBlur={handleBlur} required />
        <div className={styles.grid}>
          <Input id="cellphone" name="cellphone" label="Celular" value={formData.cellphone} onChange={handleChange} />
          <Input id="email" name="email" label="Email" type="email" value={formData.email} onChange={handleChange} />
        </div>
        <div className={styles.grid}>
          <Input id="cpf" name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} />
          <Input id="birth_date" name="birth_date" label="Data de Nascimento" type="date" value={formData.birth_date} onChange={handleChange} />
        </div>
      </fieldset>

      {!formData.cellphone && (
          <fieldset className={styles.fieldset}>
            <legend>Contato Responsável (Opcional)</legend>
            <div className={styles.searchWrapper}>
              <Input
                id="contact_search"
                name="contact_search"
                label="Buscar por nome..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                autoComplete="off"
              />
              {contactSuggestions.length > 0 && (
                <ul className={styles.searchResults}>
                  {contactSuggestions.map((suggestion) => (
                    <li key={suggestion.id} onClick={() => handleSelectContact(suggestion)}>
                      {suggestion.full_name}
                      <span>{suggestion.address_info}</span>
                    </li>
                  ))}
                </ul>
              )}
              {formData.contact_customer_id && (
                <div className={styles.selectedContact}>
                  <span>{contactSearch}</span>
                  <button type="button" onClick={handleClearContact}>Limpar</button>
                </div>
              )}
            </div>
          </fieldset>
      )}

      <fieldset className={styles.fieldset}>
        <legend>Endereço</legend>
        <div className={styles.addressGrid}>
            <Input wrapperClassName={styles.cepWrapper} id="cep" name="cep" label="CEP" value={formData.cep} onChange={handleChange} disabled={isCepLoading} />
            <Input wrapperClassName={styles.numberWrapper} id="address_number" name="address_number" label="Número" value={formData.address_number} onChange={handleChange} />
            <Input wrapperClassName={styles.complementWrapper} id="address_complement" name="address_complement" label="Complemento" value={formData.address_complement} onChange={handleChange} />
        </div>
        <div className={styles.searchWrapper}>
            <Input 
                id="address_search" 
                name="address_search" 
                label="Buscar Endereço" 
                value={addressSearch} 
                onChange={(e) => setAddressSearch(e.target.value)}
                disabled={!!formData.cep}
                placeholder="Digite o nome da rua para buscar..."
            />
            {addressSuggestions.length > 0 && (
                <ul className={styles.searchResults}>
                    {addressSuggestions.map((suggestion) => (
                        <li key={suggestion.id} onClick={() => handleSelectAddress(suggestion)}>
                            {suggestion.formatted_address}
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </fieldset>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading || isCepLoading} disabled={loading || isCepLoading}>
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;
