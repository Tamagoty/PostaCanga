// path: src/pages/LinksPage.jsx
// CORREÇÃO (v1.1): A função de busca de dados foi envolvida com useCallback
// para prevenir um loop infinito de renderização causado pelo hook useResourceManagement.

import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './LinksPage.module.css';
import { FaSearch, FaPlus, FaExternalLinkAlt, FaEdit, FaTrashAlt, FaInfoCircle, FaArrowLeft, FaArrowRight, FaSortAlphaDown, FaSortAlphaUp, FaLink } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LinkForm from '../components/LinkForm';
import ConfirmationModal from '../components/ConfirmationModal';
import DetailsModal from '../components/DetailsModal';
import { handleSupabaseError } from '../utils/errorHandler';
import { ITEMS_PER_PAGE } from '../constants';
import EmptyState from '../components/EmptyState';
import CardSkeleton from '../components/CardSkeleton';
import useResourceManagement from '../hooks/useResourceManagement';

const LinksPage = () => {
  const [detailsToShow, setDetailsToShow] = useState(null);

  // [CORREÇÃO] A função de busca agora está "memorizada" pelo useCallback com um array de dependências vazio,
  // garantindo que ela seja criada apenas uma vez e não cause um loop infinito no hook.
  const fetchLinksFn = useCallback(async ({ page, itemsPerPage, searchTerm, sortConfig }) => {
    const from = page * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data: count, error: countError } = await supabase.rpc('count_links', { p_search_term: searchTerm });
    if (countError) return { error: countError };

    let query = supabase.from('system_links').select('*');
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }
    query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' }).range(from, to);
    
    const { data, error: dataError } = await query;
    if (dataError) return { error: dataError };
    
    return { data, count };
  }, []);

  const {
    data: links,
    loading,
    isSaving,
    setIsSaving,
    isModalOpen,
    itemToEdit: linkToEdit,
    isConfirmModalOpen,
    itemToDelete: linkToDelete,
    page,
    setPage,
    totalCount,
    searchTerm,
    setSearchTerm,
    sortConfig,
    fetchData: fetchLinks,
    handleOpenModal,
    handleCloseModal,
    handleStartDelete: startDeleteLink,
    handleCloseConfirmModal,
    requestSort,
  } = useResourceManagement({ key: 'name', direction: 'asc' }, fetchLinksFn);

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
      handleCloseModal();
      fetchLinks();
    }
    setIsSaving(false);
  };

  const confirmDeleteLink = async () => {
    if (!linkToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.rpc('delete_link', { p_link_id: linkToDelete.id });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Link apagado.'); fetchLinks(); }
    setIsSaving(false);
    handleCloseConfirmModal();
  };

  const toggleSortDirection = () => {
    requestSort(sortConfig.key);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={linkToEdit ? 'Editar Link' : 'Adicionar Novo Link'}>
        <LinkForm onSave={handleSaveLink} onClose={handleCloseModal} linkToEdit={linkToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal isOpen={isConfirmModalOpen} onClose={handleCloseConfirmModal} onConfirm={confirmDeleteLink} title="Confirmar Exclusão" loading={isSaving}>
        <p>Tem certeza que deseja apagar o link para <strong>{linkToDelete?.name}</strong>?</p>
      </ConfirmationModal>

      <DetailsModal isOpen={!!detailsToShow} onClose={() => setDetailsToShow(null)} title={detailsToShow?.name} content={detailsToShow?.details} />

      <header className={styles.header}>
        <h1>Links Úteis</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}><Input id="search" placeholder="Buscar..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Button onClick={toggleSortDirection} variant="secondary" title="Alterar Ordem">
            {sortConfig.direction === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
          </Button>
          <Button onClick={() => handleOpenModal(null)}><FaPlus /> Novo Link</Button>
        </div>
      </header>

      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} />)
        ) : links.length > 0 ? (
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
                <button className={styles.actionButton} onClick={() => handleOpenModal(link)}><FaEdit /> Editar</button>
                <button className={styles.actionButton} onClick={() => startDeleteLink(link)}><FaTrashAlt /> Apagar</button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={FaLink}
            title={searchTerm ? "Nenhum resultado" : "Nenhum link"}
            message={
              searchTerm
                ? <>Nenhum link encontrado para a busca <strong>"{searchTerm}"</strong>.</>
                : "Ainda não há links úteis cadastrados."
            }
          />
        )}
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
