// path: src/components/SuggestionModal.jsx
// FUNCIONALIDADE: Adicionado campo de busca para refinar as sugestões.

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import styles from './SuggestionModal.module.css';
import { FaLink, FaSearch } from 'react-icons/fa';
import useDebounce from '../hooks/useDebounce';

const SuggestionModal = ({ isOpen, onClose, object, suggestions, onLink, onSearch, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    // A busca só é acionada se o utilizador digitar algo no campo de busca.
    if (isOpen && debouncedSearchTerm.length > 2) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch, isOpen]);

  // Limpa a busca quando o modal é fechado ou o objeto muda
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Associar Objeto a um Cliente">
      <div className={styles.context}>
        <span>Objeto para:</span>
        <strong>{object?.recipient_name}</strong>
      </div>

      <div className={styles.searchBox}>
        <Input
          id="suggestion-search"
          placeholder="Buscar por outro nome..."
          icon={FaSearch}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.listContainer}>
        {loading ? (
          <p className={styles.noSuggestions}>Buscando sugestões...</p>
        ) : suggestions.length > 0 ? (
          <ul className={styles.suggestionList}>
            {suggestions.map(customer => (
              <li key={customer.id} className={styles.suggestionItem}>
                <div className={styles.customerInfo}>
                  <span className={styles.customerName}>{customer.full_name}</span>
                  <span className={styles.customerAddress}>{customer.address_info}</span>
                </div>
                <Button onClick={() => onLink(customer.id)} loading={loading}>
                  <FaLink /> Associar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noSuggestions}>Nenhuma sugestão encontrada.</p>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
};

export default SuggestionModal;
