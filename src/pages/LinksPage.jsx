// Arquivo: src/pages/LinksPage.jsx
// MELHORIA (v1.3): Adicionada paginação e ordenação.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './LinksPage.module.css';
import { FaSearch, FaPlus, FaExternalLinkAlt, FaEdit, FaTrashAlt, FaInfoCircle, FaArrowLeft, FaArrowRight, FaSortAlphaDown, FaSortAlphaUp } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LinkForm from '../components/LinkForm';
import ConfirmationModal from '../components/ConfirmationModal';
import DetailsModal from '../components/DetailsModal';
import { handleSupabaseError } from '../utils/errorHandler';
import useDebounce from '../hooks/useDebounce';
import { ITEMS_PER_PAGE } from '../constants';

const LinksPage = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [linkToEdit, setLinkToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState(null);
  const [detailsToShow, setDetailsToShow] = useState(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- Estados para Paginação e Ordenação ---
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: count, error: countError } = await supabase.rpc('count_links');
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from('system_links').select('*');

      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`);
      }

      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' }).range(from, to);
      
      const { data, error } = await query;
      if (error) throw error;
      
      setLinks(data || []);
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig, debouncedSearchTerm]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);
  useEffect(() => { setPage(0); }, [debouncedSearchTerm]);

  const toggleSortDirection = () => {
    setSortConfig(prev => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setPage(0);
  };
  
  const handleSaveLink = async (formData) => {
    setIsSaving(true);
    const payload = {
        p_link_id: linkToEdit?.id || null, p_name: formData.name, p_url: formData.url,
        p_description: formData.description, p_details: formData.details
    };
    const { error } = await supabase.rpc('create_or_update_link', payload);
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success(`Link ${linkToEdit ? 'atualizado' : 'criado'}!`);
      setIsFormModalOpen(false);
      setLinkToEdit(null);
      fetchLinks();
    }
    setIsSaving(false);
  };

  const startDeleteLink = (link) => {
    setLinkToDelete(link);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteLink = async () => {
    if (!linkToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.rpc('delete_link', { p_link_id: linkToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Link apagado.');
      fetchLinks();
    }
    setIsSaving(false);
    setIsConfirmModalOpen(false);
    setLinkToDelete(null);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={linkToEdit ? 'Editar Link' : 'Adicionar Novo Link'}>
        <LinkForm onSave={handleSaveLink} onClose={() => setIsFormModalOpen(false)} linkToEdit={linkToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteLink}
        title="Confirmar Exclusão"
        loading={isSaving}
      >
        <p>Tem certeza que deseja apagar o link para <strong>{linkToDelete?.name}</strong>?</p>
      </ConfirmationModal>

      <DetailsModal
        isOpen={!!detailsToShow}
        onClose={() => setDetailsToShow(null)}
        title={detailsToShow?.name}
        description={detailsToShow?.description}
        content={detailsToShow?.details}
      />

      <header className={styles.header}>
        <h1>Links Úteis</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}><Input id="search" placeholder="Buscar..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Button onClick={toggleSortDirection} variant="secondary" title="Alterar Ordem">
            {sortConfig.direction === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
          </Button>
          <Button onClick={() => { setLinkToEdit(null); setIsFormModalOpen(true); }}><FaPlus /> Novo Link</Button>
        </div>
      </header>

      <div className={styles.grid}>
        {loading ? (<p>A carregar links...</p>) 
        : links.length > 0 ? (
          links.map(link => (
            <div key={link.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{link.name}</h3>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink} title="Abrir em nova aba">
                  <FaExternalLinkAlt />
                </a>
              </div>
              <div className={styles.cardBody}>
                <p>{link.description || 'Sem descrição.'}</p>
                {link.details && (
                  <button className={styles.detailsButton} onClick={() => setDetailsToShow(link)}>
                    <FaInfoCircle /> Ver Detalhes
                  </button>
                )}
              </div>
              <div className={styles.cardFooter}>
                <button className={styles.actionButton} onClick={() => { setLinkToEdit(link); setIsFormModalOpen(true); }}><FaEdit /> Editar</button>
                <button className={styles.actionButton} onClick={() => startDeleteLink(link)}><FaTrashAlt /> Apagar</button>
              </div>
            </div>
          ))
        ) : (<p>Nenhum link encontrado.</p>)}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <FaArrowLeft /> Anterior
          </Button>
          <span className={styles.pageInfo}>
            Página {page + 1} de {totalPages}
          </span>
          <Button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>
            Próxima <FaArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
};

export default LinksPage;
