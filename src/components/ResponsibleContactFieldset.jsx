// path: src/components/ResponsibleContactFieldset.jsx
import React from 'react';
import Input from './Input';
import styles from './CustomerForm.module.css';

const ResponsibleContactFieldset = ({
    contactSearch,
    setContactSearch,
    contactSuggestions,
    onSelectContact,
    onClearContact,
    contactCustomerId
}) => {
    return (
        <fieldset className={styles.fieldset}>
            <legend>Contato Responsável (Opcional)</legend>
            <div className={styles.searchWrapper}>
                <Input
                    id="contact_search"
                    name="contact_search"
                    label="Buscar por nome..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    autoComplete="off"
                    disabled={!!contactCustomerId}
                    hasClearButton={!!contactCustomerId}
                    onClear={onClearContact}
                />
                {contactSuggestions.length > 0 && (
                    <ul className={styles.searchResults}>
                        {contactSuggestions.map((suggestion) => (
                            <li key={suggestion.id} onClick={() => onSelectContact(suggestion)}>
                                {suggestion.full_name}
                                <span>{suggestion.address_info}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </fieldset>
    );
};

export default ResponsibleContactFieldset;
