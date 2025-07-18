// Arquivo: src/components/PromptModal.jsx
// DESCRIÇÃO: Componente reutilizável para solicitar texto do usuário, substituindo `window.prompt`.

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
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSave(inputValue);
      setInputValue(''); // Limpa o campo após salvar
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSave} className={styles.form}>
        <Input
          id="prompt-input"
          label={label}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          required
          autoFocus
        />
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
