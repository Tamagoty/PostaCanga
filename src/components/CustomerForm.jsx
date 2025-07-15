// Arquivo: src/components/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './CustomerForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

const CustomerForm = ({ onSave, onClose, customerToEdit, loading }) => {
  const initialFormData = {
    full_name: '',
    cpf: '',
    cellphone: '',
    birth_date: '',
    contact_customer_id: '', // Novo campo
    cep: '',
    street_type: '',
    street_name: '',
    neighborhood: '',
    city: '',
    state: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [contactOptions, setContactOptions] = useState([]);

  // Busca clientes que podem ser contatos (têm celular)
  useEffect(() => {
    const fetchContactOptions = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name')
        .not('cellphone', 'is', null) // Apenas clientes com celular
        .order('full_name');
      
      if (error) {
        toast.error('Erro ao carregar opções de contato.');
      } else {
        // Filtra o próprio cliente da lista de opções
        const filteredData = data.filter(c => c.id !== customerToEdit?.id);
        setContactOptions(filteredData);
      }
    };
    fetchContactOptions();
  }, [customerToEdit]);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        full_name: customerToEdit.full_name || '',
        cpf: customerToEdit.cpf || '',
        cellphone: customerToEdit.cellphone || '',
        birth_date: customerToEdit.birth_date ? new Date(customerToEdit.birth_date).toISOString().split('T')[0] : '',
        contact_customer_id: customerToEdit.contact_customer_id || '',
        cep: customerToEdit.addresses?.cep || '',
        street_type: customerToEdit.addresses?.street_type || '',
        street_name: customerToEdit.addresses?.street_name || '',
        neighborhood: customerToEdit.addresses?.neighborhood || '',
        city: customerToEdit.addresses?.city || '',
        state: customerToEdit.addresses?.state || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [customerToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast.error('O nome completo é obrigatório.');
      return;
    }
    const payload = {
      ...formData,
      p_customer_id: customerToEdit?.id || null,
      p_address_id: customerToEdit?.address_id || null,
      p_contact_customer_id: formData.contact_customer_id || null,
    };
    onSave(payload);
  };

  const showContactField = !formData.cellphone;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados Pessoais e Contato</legend>
        <Input id="full_name" name="full_name" label="Nome Completo" value={formData.full_name} onChange={handleChange} required />
        <div className={styles.grid}>
          <Input id="cpf" name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
          <Input id="birth_date" name="birth_date" label="Data de Nascimento" type="date" value={formData.birth_date} onChange={handleChange} />
        </div>
        <Input id="cellphone" name="cellphone" label="Celular" value={formData.cellphone} onChange={handleChange} placeholder="(00) 00000-0000" />
        
        {showContactField && (
          <div className={styles.formGroup}>
            <label htmlFor="contact_customer_id">Associar a um Contato (para notificações)</label>
            <select
              id="contact_customer_id"
              name="contact_customer_id"
              value={formData.contact_customer_id}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">Nenhum</option>
              {contactOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </fieldset>
      
      <fieldset className={styles.fieldset}>
        <legend>Endereço</legend>
        {/* Campos de endereço inalterados */}
        <Input id="cep" name="cep" label="CEP" value={formData.cep} onChange={handleChange} placeholder="00000-000" />
        <div className={styles.grid}>
          <Input id="street_name" name="street_name" label="Logradouro" value={formData.street_name} onChange={handleChange} />
          <Input id="street_type" name="street_type" label="Tipo" value={formData.street_type} onChange={handleChange} placeholder="Rua, Av." />
        </div>
        <div className={styles.grid}>
          <Input id="neighborhood" name="neighborhood" label="Bairro" value={formData.neighborhood} onChange={handleChange} />
          <Input id="city" name="city" label="Cidade" value={formData.city} onChange={handleChange} />
          <Input id="state" name="state" label="UF" value={formData.state} onChange={handleChange} maxLength="2" placeholder="SP" />
        </div>
      </fieldset>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;
