// Arquivo: src/components/DetailsModal.jsx
// DESCRIÇÃO: Novo componente de modal para exibir informações detalhadas.

import React from 'react';
import Modal from './Modal';
import Button from './Button';
import styles from './DetailsModal.module.css';

const DetailsModal = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes de: ${title}`}>
      <div className={styles.content}>
        <pre className={styles.preformatted}>{content}</pre>
      </div>
      <div className={styles.actions}>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
};

export default DetailsModal;
