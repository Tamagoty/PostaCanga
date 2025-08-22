// path: src/components/SuggestionModal.jsx
import React, { useState, useEffect } from 'react';
import styles from './SuggestionModal.module.css';
import { supabase } from '../lib/supabase';
import useDebounce from '../hooks/useDebounce';
import Input from './Input';
import Button from './Button';
import { FaSearch, FaTimes } from 'react-icons/fa';

const SuggestionModal = ({ isOpen, onClose, object, onLink, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Quando o modal abre com um novo objeto, inicializa o termo de busca
    // com o nome do destinatário para obter as sugestões iniciais.
    useEffect(() => {
        if (object) {
            setSearchTerm(object.recipient_name);
        }
    }, [object]);

    // Efeito para buscar sugestões quando o termo de busca muda
    useEffect(() => {
        const getSuggestions = async () => {
            if (debouncedSearchTerm.length < 3) {
                setSuggestions([]);
                return;
            }
            const { data, error } = await supabase.rpc('suggest_customer_links', { p_search_term: debouncedSearchTerm });
            if (error) {
                console.error(error);
                setSuggestions([]);
            } else {
                setSuggestions(data || []);
            }
        };

        if (isOpen) {
            getSuggestions();
        }
    }, [debouncedSearchTerm, isOpen]);

    if (!isOpen || !object) return null;

    return (
        <div className={styles.container}>
            <div className={styles.objectInfo}>
                <p><strong>Destinatário:</strong> {object.recipient_name}</p>
                <p><strong>N° Controle:</strong> {object.control_number}</p>
            </div>
            <div className={styles.searchSection}>
                <Input
                    id="suggestion-search"
                    icon={FaSearch}
                    placeholder="Buscar cliente para ligar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {loading ? (
                    <p className={styles.loadingText}>Buscando...</p>
                ) : suggestions.length > 0 ? (
                    <ul className={styles.suggestionsList}>
                        {suggestions.map(customer => (
                            <li key={customer.id} onClick={() => onLink(customer.id)}>
                                <strong>{customer.full_name}</strong>
                                <span>{customer.address_info}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={styles.noResults}>Nenhuma sugestão encontrada.</p>
                )}
            </div>
             <div className={styles.actions}>
                <Button variant="secondary" onClick={onClose}>
                    <FaTimes /> Fechar
                </Button>
            </div>
        </div>
    );
};

export default SuggestionModal;
