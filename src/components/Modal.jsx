// Arquivo: src/components/Modal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>{title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <FaTimes />
          </button>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') // Precisamos de um <div id="modal-root"></div> no index.html
  );
};

export default Modal;
