// Arquivo: src/components/EmployeeForm.jsx
import React, { useState } from 'react';
import styles from './CustomerForm.module.css'; // Reutilizando estilos
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const EmployeeForm = ({ onSave, onClose, loading }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    registration_number: '',
    role: 'employee',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name || !formData.registration_number) {
      toast.error('Todos os campos são obrigatórios.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados do Funcionário</legend>
        <Input id="full_name" name="full_name" label="Nome Completo" value={formData.full_name} onChange={handleChange} required />
        <Input id="registration_number" name="registration_number" label="Matrícula" value={formData.registration_number} onChange={handleChange} required />
        <div className={styles.formGroup}>
          <label htmlFor="role">Permissão</label>
          <select id="role" name="role" value={formData.role} onChange={handleChange} className={styles.select}>
            <option value="employee">Funcionário</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>Credenciais de Acesso</legend>
        <Input id="email" name="email" label="E-mail" type="email" value={formData.email} onChange={handleChange} required />
        <Input id="password" name="password" label="Senha" type="password" value={formData.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" />
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Criando...' : 'Criar Funcionário'}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeForm;
