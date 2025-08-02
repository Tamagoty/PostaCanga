// path: src/components/MessageTemplateForm.jsx
// CORREÇÃO (v1.2): Corrigida a sintaxe no helper de variáveis para
// evitar um erro de referência que quebrava o componente.

import React, { useState, useEffect } from 'react';
import styles from './MessageTemplateForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const MessageTemplateForm = ({ onSave, onClose, templateToEdit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
  });

  useEffect(() => {
    if (templateToEdit) {
      setFormData({
        name: templateToEdit.name || '',
        content: templateToEdit.content || '',
      });
    } else {
      setFormData({ name: '', content: '' });
    }
  }, [templateToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.content) {
      toast.error('O Nome e o Conteúdo do modelo são obrigatórios.');
      return;
    }
    const payload = { ...formData, p_id: templateToEdit?.id || null };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes do Modelo</legend>
        <Input id="name" name="name" label="Nome do Modelo (ex: Promoção de Julho)" value={formData.name} onChange={handleChange} required />
        <div className={styles.formGroup}>
          <label htmlFor="content">Conteúdo da Mensagem</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            className={styles.textarea}
            rows="6"
            placeholder="Escreva sua mensagem aqui. Use variáveis como {{NOME_CLIENTE}}."
            required
          />
           <div className={styles.variableHelper}>
            {/* [CORREÇÃO] O texto agora é uma string para evitar erros de compilação. */}
            {"Variáveis: {{NOME_CLIENTE}}, {{DIAS_RESTANTES}}, {{DATA_PRAZO}}"}
          </div>
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Modelo'}
        </Button>
      </div>
    </form>
  );
};

export default MessageTemplateForm;
