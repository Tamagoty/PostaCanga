// path: src/components/Input.jsx
import React from 'react';
import styles from './Input.module.css';
import { FaTimesCircle } from 'react-icons/fa';

const Input = ({ id, label, icon: Icon, value, wrapperClassName, hasClearButton, onClear, ...props }) => {
  return (
    <div className={`${styles.inputWrapper} ${wrapperClassName || ''}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <div className={styles.inputContainer}>
        {Icon && <Icon className={styles.icon} />}
          <input
          id={id}
          className={styles.input}
          value={value || ''}
          {...props}
        />
        {hasClearButton && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            <FaTimesCircle />
          </button>
        )}
      </div>
    </div>
  );
};

export default Input;
