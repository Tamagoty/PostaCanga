// path: src/components/PromptModal.jsx
// FUNCIONALIDADE: Adicionado um dropdown para selecionar modelos de mensagem.

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import styles from './PromptModal.module.css';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';
import toast from 'react-hot-toast';

const PromptModal = ({
  isOpen,
  onClose,
  onSave,
  title,
  label,
  placeholder = '',
  loading = false,
  confirmText = 'Salvar',
  isTextarea = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [templates, setTemplates] = useState([]);

  // Busca os modelos de mensagem quando o modal é aberto
  useEffect(() => {
    if (isOpen && isTextarea) {
      const fetchTemplates = async () => {
        const { data, error } = await supabase.rpc('get_message_templates');
        if (error) {
          toast.error(handleSupabaseError(error));
        } else {
          setTemplates(data || []);
        }
      };
      fetchTemplates();
    }
  }, [isOpen, isTextarea]);

  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    if (templateId) {
      const selectedTemplate = templates.find(t => t.id === templateId);
      if (selectedTemplate) {
        setInputValue(selectedTemplate.content);
      }
    } else {
      setInputValue('');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(inputValue.trim());
    setInputValue('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSave} className={styles.form}>
        {isTextarea && templates.length > 0 && (
          <div className={styles.formGroup}>
            <label htmlFor="template-select" className={styles.label}>Usar um modelo</label>
            <select id="template-select" onChange={handleTemplateChange} className={styles.templateSelect} defaultValue="">
              <option value="">-- Selecione um modelo --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>
        )}

        {isTextarea ? (
          <div className={styles.formGroup}>
            <label htmlFor="prompt-input" className={styles.label}>{label}</label>
            <textarea
              id="prompt-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className={styles.textarea}
              rows="4"
              autoFocus
            />
          </div>
        ) : (
          <Input
            id="prompt-input"
            label={label}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            required
            autoFocus
          />
        )}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PromptModal;
