// path: src/components/FastLinkerModal.jsx
import React, { useState, useEffect } from 'react';
import styles from './FastLinkerModal.module.css';
import { supabase } from '../lib/supabase';
import useDebounce from '../hooks/useDebounce';
import Input from './Input';
import Button from './Button';
import { FaSearch, FaArrowRight, FaArrowLeft, FaTimes } from 'react-icons/fa';

const FastLinkerModal = ({ isOpen, onClose, object, onLink, onSkip, onBack, loading, total, current }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Efeito para buscar sugestões iniciais quando o objeto muda
    useEffect(() => {
        if (object) {
            const fetchInitialSuggestions = async () => {
                setIsSearching(true);
                setSearchTerm(object.recipient_name); // Atualiza o input com o nome do destinatário
                const { data, error } = await supabase.rpc('suggest_customer_links', { p_search_term: object.recipient_name });
                if (error) {
                    console.error(error);
                    setSuggestions([]);
                } else {
                    setSuggestions(data || []);
                }
                setIsSearching(false);
            };
            fetchInitialSuggestions();
        }
    }, [object]);

    // Efeito para buscar sugestões conforme o usuário digita
    useEffect(() => {
        const getSuggestions = async () => {
            // Não busca se o termo for o mesmo do destinatário inicial (já buscado)
            if (debouncedSearchTerm === object?.recipient_name || debouncedSearchTerm.length < 3) {
                return;
            }
            setIsSearching(true);
            const { data, error } = await supabase.rpc('suggest_customer_links', { p_search_term: debouncedSearchTerm });
            if (error) {
                console.error(error);
                setSuggestions([]);
            } else {
                setSuggestions(data || []);
            }
            setIsSearching(false);
        };

        if (object) {
            getSuggestions();
        }
    }, [debouncedSearchTerm, object]);

    if (!isOpen || !object) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Ligar Objeto a Cliente</h3>
                <span className={styles.progress}>{current + 1} de {total}</span>
            </div>
            <div className={styles.objectInfo}>
                <div className={styles.infoField}>
                    <span className={styles.infoLabel}>Destinatário:</span>
                    <span className={styles.infoValue}>{object.recipient_name}</span>
                </div>
                <div className={styles.infoField}>
                    <span className={styles.infoLabel}>Endereço do Objeto:</span>
                    <span className={styles.infoValue}>{object.delivery_address || 'Não informado'}</span>
                </div>
                <div className={styles.infoGrid}>
                    <div className={styles.infoField}>
                        <span className={styles.infoLabel}>N° Controle:</span>
                        <span className={styles.infoValue}>{object.control_number}</span>
                    </div>
                    <div className={styles.infoField}>
                        <span className={styles.infoLabel}>Chegada:</span>
                        <span className={styles.infoValue}>{new Date(object.arrival_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                </div>
            </div>
            <div className={styles.searchSection}>
                <Input
                    id="customer-search"
                    icon={FaSearch}
                    placeholder="Buscar cliente para ligar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {isSearching ? (
                     <p className={styles.loadingText}>A procurar...</p>
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
                 <Button variant="danger" onClick={onClose} className={styles.closeButton}>
                    <FaTimes /> Fechar
                </Button>
                <div className={styles.navigationButtons}>
                    <Button variant="secondary" onClick={onBack} disabled={loading || current === 0} className={styles.navButton}>
                       <FaArrowLeft /> Voltar
                    </Button>
                    <Button variant="secondary" onClick={onSkip} disabled={loading} className={styles.navButton}>
                        Pular <FaArrowRight />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default FastLinkerModal;
