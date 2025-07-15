// Arquivo: src/components/ToggleSwitch.jsx
import React from 'react';
import styles from './ToggleSwitch.module.css';

const ToggleSwitch = ({ id, checked, onChange, disabled = false }) => {
  return (
    <label htmlFor={id} className={styles.switch}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={styles.slider}></span>
    </label>
  );
};

export default ToggleSwitch;
