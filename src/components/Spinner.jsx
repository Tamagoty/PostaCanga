// path: src/components/Spinner.jsx
import React from 'react';
import styles from './Spinner.module.css';

/**
 * Um componente de spinner para indicar carregamento.
 * @param {object} props - As propriedades do componente.
 * @param {string} [props.size='36px'] - O tamanho do spinner (ex: '50px').
 * @param {string} [props.color='var(--accent-primary)'] - A cor do spinner.
 */
const Spinner = ({ size = '36px', color = 'var(--accent-primary)' }) => {
  const spinnerStyle = {
    width: size,
    height: size,
    borderTopColor: color,
  };

  return <div className={styles.spinner} style={spinnerStyle}></div>;
};

export default Spinner;
