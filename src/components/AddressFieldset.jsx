// path: src/components/AddressFieldset.jsx
import React from 'react';
import Input from './Input';
import styles from './CustomerForm.module.css';
import { capitalizeName } from '../utils/formatters';

const AddressFieldset = ({
    formData,
    handleChange,
    setFormData,
    isCepLoading,
    addressSearch,
    onAddressSearchChange,
    addressSuggestions,
    onSelectAddress
}) => {
    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (['street_name', 'neighborhood', 'city_name'].includes(name)) {
            setFormData(prev => ({ ...prev, [name]: capitalizeName(value) }));
        }
    };

    return (
        <fieldset className={styles.fieldset}>
            <legend>Endereço</legend>
            <div className={styles.addressGrid}>
                <Input wrapperClassName={styles.cepWrapper} id="cep" name="cep" label="CEP" value={formData.cep} onChange={handleChange} disabled={isCepLoading} />
                <Input wrapperClassName={styles.numberWrapper} id="address_number" name="address_number" label="Número" value={formData.address_number} onChange={handleChange} />
                <Input wrapperClassName={styles.complementWrapper} id="address_complement" name="address_complement" label="Complemento" value={formData.address_complement} onChange={handleChange} />
            </div>
            <div className={styles.searchWrapper}>
                <Input
                    id="address_search"
                    name="address_search"
                    label="Buscar Endereço"
                    value={addressSearch}
                    onChange={onAddressSearchChange}
                    onBlur={handleBlur}
                    disabled={!!formData.cep && formData.cep.replace(/\D/g, '').length === 8}
                    placeholder="Digite o nome da rua para buscar..."
                />
                {addressSuggestions.length > 0 && (
                    <ul className={styles.searchResults}>
                        {addressSuggestions.map((suggestion) => (
                            <li key={suggestion.id} onClick={() => onSelectAddress(suggestion)}>
                                {`${suggestion.street_name}, ${suggestion.neighborhood || 'Bairro não informado'}`}
                                <span>{`${suggestion.city_name}/${suggestion.state_uf} - CEP: ${suggestion.cep || 'N/A'}`}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </fieldset>
    );
};

export default AddressFieldset;
