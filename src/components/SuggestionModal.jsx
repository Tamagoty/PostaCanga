// path: src/components/SuggestionModal.jsx
// MELHORIA: A lógica de busca de sugestões foi movida para dentro do modal,
// tornando-o um componente autossuficiente e corrigindo os bugs.

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import styles from './SuggestionModal.module.css';
import { FaLink, FaSearch } from 'react-icons/fa';
import useDebounce from '../hooks/useDebounce';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';
import toast from 'react-hot-toast';

const SuggestionModal = ({ isOpen, onClose, object, onLink, loading: isLinking }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Efeito para buscar sugestões. É ativado quando o modal abre ou quando o utilizador digita.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchSuggestions = async (term) => {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('suggest_customer_links', { p_search_term: term });
      
      if (error) {
        toast.error(handleSupabaseError(error));
        setSuggestions([]);
      } else {
        setSuggestions(data || []);
      }
      setIsLoading(false);
    };

    // Se o campo de busca estiver vazio, usa o nome do destinatário para as sugestões iniciais.
    // Se não, usa o termo digitado.
    const termToSearch = debouncedSearchTerm.trim() === '' ? object.recipient_name : debouncedSearchTerm;
    fetchSuggestions(termToSearch);

  }, [isOpen, debouncedSearchTerm, object]);

  // Efeito para limpar o campo de busca quando o modal é reaberto.
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen || !object) return null;

  // Constrói a string de endereço do objeto
  const objectAddress = object.delivery_street_name
    ? `${object.delivery_street_name}, ${object.delivery_address_number || 'S/N'}`
    : (object.addresses ? `${object.addresses.street_name}, ${object.addresses.number || 'S/N'}` : 'Endereço não informado');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Associar Objeto a Cliente">
      <div className={styles.container}>
        <div className={styles.objectInfo}>
          <h4>Objeto Atual</h4>
          <p><strong>Destinatário:</strong> {object.recipient_name}</p>
          <p><strong>Endereço no Objeto:</strong> {objectAddress}</p>
        </div>

        <div className={styles.searchSection}>
          <Input
            id="suggestion-search"
            label="Buscar por outro cliente"
            placeholder="Digite um nome para buscar..."
            icon={FaSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.suggestionsList}>
          {isLoading ? <p>A procurar...</p> : null}
          {!isLoading && suggestions.length === 0 ? <p>Nenhuma sugestão encontrada.</p> : null}
          {!isLoading && suggestions.map(customer => (
            <div key={customer.id} className={styles.suggestionItem}>
              <div className={styles.customerInfo}>
                <span className={styles.customerName}>{customer.full_name}</span>
                <span className={styles.customerAddress}>{customer.address_info}</span>
              </div>
              <Button onClick={() => onLink(customer.id)} disabled={isLinking}>
                <FaLink /> Associar
              </Button>
            </div>
          ))}
        </div>
        
        <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose} disabled={isLinking}>
                Cancelar
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SuggestionModal;
