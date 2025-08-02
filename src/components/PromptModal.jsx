// path: src/components/PromptModal.jsx
// MELHORIA: Adicionada a prop `isTextarea` para permitir a inserção de textos mais longos.

import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import styles from './PromptModal.module.css';

const PromptModal = ({
  isOpen,
  onClose,
  onSave,
  title,
  label,
  placeholder = '',
  loading = false,
  confirmText = 'Salvar',
  isTextarea = false, // Nova prop para alternar entre input e textarea
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    // A validação .trim() permite que mensagens vazias (apenas com espaços) sejam consideradas como "não preenchidas"
    // e a mensagem padrão seja enviada.
    onSave(inputValue.trim());
    setInputValue('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSave} className={styles.form}>
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
