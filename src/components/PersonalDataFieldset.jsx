// path: src/components/PersonalDataFieldset.jsx
import React from 'react';
import Input from './Input';
import styles from './CustomerForm.module.css';
import { capitalizeName } from '../utils/formatters';

const PersonalDataFieldset = ({ formData, handleChange, setFormData }) => {
    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (name === 'full_name') {
            setFormData(prev => ({ ...prev, [name]: capitalizeName(value) }));
        }
    };

    return (
        <fieldset className={styles.fieldset}>
            <legend>Dados Pessoais</legend>
            <Input id="full_name" name="full_name" label="Nome Completo" value={formData.full_name} onChange={handleChange} onBlur={handleBlur} required />
            <div className={styles.grid}>
                <Input id="cellphone" name="cellphone" label="Celular" value={formData.cellphone} onChange={handleChange} />
                <Input id="email" name="email" label="Email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div className={styles.grid}>
                <Input id="cpf" name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} />
                <Input id="birth_date" name="birth_date" label="Data de Nascimento" type="date" value={formData.birth_date} onChange={handleChange} />
            </div>
        </fieldset>
    );
};

export default PersonalDataFieldset;
