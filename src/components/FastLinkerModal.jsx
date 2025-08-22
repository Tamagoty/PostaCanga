// path: src/components/FastLinkerModal.jsx
import React, { useState, useEffect } from 'react';
import styles from './FastLinkerModal.module.css';
import { supabase } from '../lib/supabase';
import useDebounce from '../hooks/useDebounce';
import Input from './Input';
import Button from './Button';
import { FaSearch, FaArrowRight, FaArrowLeft, FaTimes } from 'react-icons/fa';

const SkeletonLoader = () => (
    <div className={styles.skeletonContainer}>
        {[...Array(3)].map((_, index) => (
            <div key={index} className={styles.skeletonItem}>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonSubtext}></div>
            </div>
        ))}
    </div>
);

const FastLinkerModal = ({ isOpen, onClose, object, onLink, onSkip, onBack, loading, total, current }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(true);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (object) {
            setSearchTerm(object.recipient_name);
        }
    }, [object]);

    useEffect(() => {
        const getSuggestions = async () => {
            if (!object || !debouncedSearchTerm) {
                setSuggestions([]);
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
        
        if (isOpen) {
            getSuggestions();
        }
    }, [debouncedSearchTerm, object, isOpen]);

    if (!isOpen || !object) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Ligar Objeto</h3>
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
                     <SkeletonLoader />
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
