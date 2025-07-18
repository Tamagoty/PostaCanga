// Arquivo: src/components/ConfirmationModal.jsx
// DESCRIÇÃO: Componente reutilizável para confirmar ações destrutivas (ex: exclusão).
//            Substitui o `window.confirm` padrão do navegador por um modal estilizado.

import React from 'react';
import Modal from './Modal';
import Button from './Button';
import styles from './ConfirmationModal.module.css';
import { FaExclamationTriangle } from 'react-icons/fa';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Ação',
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <FaExclamationTriangle />
        </div>
        <div className={styles.textWrapper}>
          {children}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
