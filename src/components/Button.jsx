// Arquivo: src/components/Button.jsx
// Descrição: Componente de Botão padronizado e reutilizável.

import React from 'react';
import styles from './Button.module.css';

// variant: 'primary', 'secondary', 'danger'
// ...props: outras props de botão como onClick, disabled, etc.
const Button = ({ children, variant = 'primary', loading = false, ...props }) => {
  const variantClass = styles[variant] || styles.primary;

  return (
    <button className={`${styles.button} ${variantClass}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className={styles.loader}></span> : children}
    </button>
  );
};

export default Button;
