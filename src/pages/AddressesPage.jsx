// Arquivo: src/pages/AddressesPage.jsx
// MELHORIA (v5): Adicionada ordenação clicável em todas as colunas da tabela.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt, FaArrowLeft, FaArrowRight, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import AddressForm from '../components/AddressForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';
import { ITEMS_PER_PAGE } from '../constants';

const AddressesPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // --- Estado para a ordenação ---
  const [sortConfig, setSortConfig] = useState({ key: 'street_name', direction: 'asc', referencedTable: null });

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const { data: count, error: countError } = await supabase.rpc('count_addresses');
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Query agora inclui a lógica de ordenação dinâmica
      const { data, error } = await supabase
        .from('addresses')
        .select('*, city:cities(name, state:states(uf))')
        .order(sortConfig.key, {
          ascending: sortConfig.direction === 'asc',
          referencedTable: sortConfig.referencedTable,
        })
        .range(from, to);
        
      if (error) throw error;
      
      setAddresses(data);
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig]); // A busca agora depende da página e da ordenação

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  // Função para mudar a ordenação
  const requestSort = (key, referencedTable = null) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction, referencedTable });
    setPage(0); // Volta para a primeira página ao reordenar
  };

  // Função para exibir o ícone de ordenação
  const getSortIcon = (name) => {
    if (sortConfig.key !== name) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
  };

  const handleOpenModal = (address = null) => {
    setAddressToEdit(address);
    setIsFormModalOpen(true);
  };

  const handleSaveAddress = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_address', formData);
    if (error) toast.error(handleSupabaseError(error));
    else {
      toast.success('Endereço salvo com sucesso!');
      setIsFormModalOpen(false);
      fetchAddresses();
    }
    setIsSaving(false);
  };

  const startDeleteAddress = (address) => {
    setAddressToDelete(address);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_address', { p_address_id: addressToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Endereço apagado.');
      fetchAddresses();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setAddressToDelete(null);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={addressToEdit ? 'Editar Endereço' : 'Novo Endereço'}>
        <AddressForm onSave={handleSaveAddress} onClose={() => setIsFormModalOpen(false)} addressToEdit={addressToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteAddress}
        title="Confirmar Exclusão"
        loading={isDeleting}
      >
        <p>Tem certeza que deseja apagar o endereço <strong>{addressToDelete?.street_name}</strong>?</p>
        <p>Esta ação só funcionará se o endereço não estiver em uso por nenhum cliente.</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Gerenciamento de Endereços</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Novo Endereço</Button>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.sortableHeader} onClick={() => requestSort('street_name')}>
                Logradouro {getSortIcon('street_name')}
              </th>
              <th className={styles.sortableHeader} onClick={() => requestSort('neighborhood')}>
                Bairro {getSortIcon('neighborhood')}
              </th>
              <th className={styles.sortableHeader} onClick={() => requestSort('name', 'cities')}>
                Cidade/UF {getSortIcon('name')}
              </th>
              <th className={styles.sortableHeader} onClick={() => requestSort('cep')}>
                CEP {getSortIcon('cep')}
              </th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan="5">A carregar...</td></tr>)
            : addresses.map(addr => (
              <tr key={addr.id}>
                <td data-label="Logradouro">{addr.street_name}</td>
                <td data-label="Bairro">{addr.neighborhood || '-'}</td>
                <td data-label="Cidade/UF">{addr.city ? `${addr.city.name}/${addr.city.state.uf}` : 'N/A'}</td>
                <td data-label="CEP">{addr.cep || '-'}</td>
                <td data-label="Ações">
                  <div className={styles.actionButtons}>
                    <button className={styles.actionButton} onClick={() => handleOpenModal(addr)}><FaEdit /></button>
                    <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => startDeleteAddress(addr)}><FaTrashAlt /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

export default AddressesPage;
