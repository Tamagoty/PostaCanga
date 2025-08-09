// path: src/components/MessageTemplateForm.jsx
import React, { useState, useEffect } from 'react';
import styles from './MessageTemplateForm.module.css';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

// [NOVA LÓGICA] Mapeamento de variáveis para nomes amigáveis
const VARIABLE_MAP = {
  '{{NOME_CLIENTE}}': 'Nome do Cliente',
  '{{TIPO_OBJETO}}': 'Tipo do Objeto',
  '{{CODIGO_RASTREIO}}': 'Cód. de Rastreio',
  '{{NUMERO_CONTROLE}}': 'Nº de Controle',
  '{{DIAS_RESTANTES}}': 'Dias Restantes',
  '{{DATA_PRAZO}}': 'Data do Prazo',
  '{{NOME_DA_AGENCIA}}': 'Nome da Agência',
  '{{ENDERECO_AGENCIA}}': 'Endereço da Agência',
};

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
    const payload = { 
        id: templateToEdit?.id || null,
        name: formData.name,
        content: formData.content
    };
    onSave(payload);
  };

  const handleVariableClick = (variable) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Variável ${variable} copiada!`);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes do Modelo</legend>
        <Input id="name" name="name" label="Nome do Modelo (ex: Aviso de Vencimento)" value={formData.name} onChange={handleChange} required />
        <div className={styles.formGroup}>
          <label htmlFor="content">Conteúdo da Mensagem</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            className={styles.textarea}
            rows="8"
            placeholder="Escreva sua mensagem aqui..."
            required
          />
           <div className={styles.variableHelper}>
            <p>Clique numa variável para a copiar:</p>
            <div className={styles.variableGrid}>
                {Object.entries(VARIABLE_MAP).map(([variable, friendlyName]) => (
                    <div 
                        key={variable} 
                        className={styles.variableTag}
                        onClick={() => handleVariableClick(variable)}
                        title={`Copiar ${variable}`}
                    >
                        {friendlyName}
                    </div>
                ))}
            </div>
          </div>
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'A Guardar...' : 'Guardar Modelo'}
        </Button>
      </div>
    </form>
  );
};

export default MessageTemplateForm;
