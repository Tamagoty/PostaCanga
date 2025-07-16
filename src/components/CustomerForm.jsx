// Arquivo: src/components/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './CustomerForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { FaSearch } from 'react-icons/fa';

const CustomerForm = ({ onSave, onClose, customerToEdit, loading }) => {
  const initialFormData = {
    full_name: '', cpf: '', cellphone: '', birth_date: '', email: '',
    contact_customer_id: '', address_id: '', address_number: '', address_complement: ''
  };
  const [formData, setFormData] = useState(initialFormData);
  const [contactOptions, setContactOptions] = useState([]);
  const [addressOptions, setAddressOptions] = useState([]);
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const fetchAddressOptions = async () => {
    const { data: addresses } = await supabase.from('addresses').select('*, city:cities(name, state:states(uf))').order('street_name');
    if (addresses) setAddressOptions(addresses);
  };

  useEffect(() => {
    const fetchInitialOptions = async () => {
      const { data: contacts } = await supabase.from('customers').select('id, full_name').eq('is_active', true).not('cellphone', 'is', null).order('full_name');
      if (contacts) setContactOptions(contacts.filter(c => c.id !== customerToEdit?.id));
      fetchAddressOptions();
    };
    fetchInitialOptions();
  }, [customerToEdit]);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        full_name: customerToEdit.full_name || '', cpf: customerToEdit.cpf || '', cellphone: customerToEdit.cellphone || '',
        birth_date: customerToEdit.birth_date ? new Date(customerToEdit.birth_date).toISOString().split('T')[0] : '',
        email: customerToEdit.email || '', contact_customer_id: customerToEdit.contact_customer_id || '',
        address_id: customerToEdit.address_id || '', address_number: customerToEdit.address_number || '',
        address_complement: customerToEdit.address_complement || ''
      });
    } else {
      setFormData(initialFormData);
    }
  }, [customerToEdit]);

  const handleCepSearch = async () => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) {
      toast.error('Por favor, insira um CEP válido com 8 dígitos.');
      return;
    }
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast.error('CEP não encontrado.');
      } else {
        const { data: addressId, error } = await supabase.rpc('find_or_create_address_by_cep', {
          p_cep: data.cep,
          p_street_name: data.logradouro,
          p_neighborhood: data.bairro,
          p_city_name: data.localidade,
          p_state_uf: data.uf
        });

        if (error) throw error;

        await fetchAddressOptions(); // Atualiza a lista de endereços
        setFormData(prev => ({ ...prev, address_id: addressId }));
        toast.success('Endereço encontrado e selecionado!');
      }
    } catch (error) {
      toast.error(`Falha: ${error.message}`);
    } finally {
      setCepLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) { toast.error('O nome completo é obrigatório.'); return; }
    const payload = { ...formData, p_customer_id: customerToEdit?.id || null };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados Pessoais e Contato</legend>
        <Input id="full_name" name="full_name" label="Nome Completo" value={formData.full_name} onChange={handleChange} required />
        <div className={styles.grid}><Input id="cpf" name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} /><Input id="birth_date" name="birth_date" label="Data de Nascimento" type="date" value={formData.birth_date} onChange={handleChange} /></div>
        <Input id="cellphone" name="cellphone" label="Celular" value={formData.cellphone} onChange={handleChange} />
        <Input id="email" name="email" label="E-mail" type="email" value={formData.email} onChange={handleChange} />
        {!formData.cellphone && (
          <div className={styles.formGroup}>
            <label htmlFor="contact_customer_id">Associar a um Contato</label>
            <select id="contact_customer_id" name="contact_customer_id" value={formData.contact_customer_id} onChange={handleChange} className={styles.select}>
              <option value="">Nenhum</option>
              {contactOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.full_name}</option>)}
            </select>
          </div>
        )}
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>Endereço</legend>
        <div className={styles.cepGroup}>
          <Input id="cep-lookup" name="cep-lookup" label="Buscar Endereço por CEP" value={cep} onChange={(e) => setCep(e.target.value)} />
          <Button type="button" onClick={handleCepSearch} loading={cepLoading} className={styles.cepButton}><FaSearch /></Button>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="address_id">Rua / Logradouro</label>
          <select id="address_id" name="address_id" value={formData.address_id} onChange={handleChange} className={styles.select}>
            <option value="">Selecione um endereço ou busque por CEP</option>
            {addressOptions.map(addr => (
              <option key={addr.id} value={addr.id}>
                {`${addr.street_name} - ${addr.city.name}/${addr.city.state.uf}`}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.grid}>
          <Input id="address_number" name="address_number" label="Número" value={formData.address_number} onChange={handleChange} />
          <Input id="address_complement" name="address_complement" label="Complemento" value={formData.address_complement} onChange={handleChange} placeholder="Apto, Bloco, etc." />
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cliente'}</Button>
      </div>
    </form>
  );
};

export default CustomerForm;
