// Arquivo: src/components/Input.jsx
import React from 'react';
import styles from './Input.module.css';

const Input = ({ id, label, icon: Icon, value, ...props }) => {
  return (
    <div className={styles.inputWrapper}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <div className={styles.inputContainer}>
        {Icon && <Icon className={styles.icon} />}
          <input
          id={id}
          className={styles.input}
          value={value || ''}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;
