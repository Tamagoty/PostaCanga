// Arquivo: src/pages/SuppliesPage.jsx
// MELHORIA (v7): A busca agora é feita no banco de dados, garantindo
// que a paginação e os resultados sejam sempre precisos.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaPlusCircle, FaMinusCircle, FaHistory, FaArrowLeft, FaArrowRight, FaArrowUp, FaArrowDown, FaClipboardList } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SupplyForm from '../components/SupplyForm';
import AdjustStockForm from '../components/AdjustStockForm';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import { handleSupabaseError } from '../utils/errorHandler';
import { ITEMS_PER_PAGE } from '../constants';
import EmptyState from '../components/EmptyState';
import TableSkeleton from '../components/TableSkeleton';

const SuppliesPage = () => {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [supplyToEdit, setSupplyToEdit] = useState(null);
  const [supplyToAdjust, setSupplyToAdjust] = useState(null);
  const [adjustActionType, setAdjustActionType] = useState('add');
  const navigate = useNavigate();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchSupplies = useCallback(async () => {
    setLoading(true);
    try {
      // 1. A contagem agora passa o termo da busca para o backend.
      const { data: count, error: countError } = await supabase.rpc('count_supplies', { p_search_term: debouncedSearchTerm });
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from('office_supplies').select('*');
      
      // 2. A filtragem também é feita no backend.
      if (debouncedSearchTerm) {
        query = query.ilike('name', `%${debouncedSearchTerm}%`);
      }

      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' }).range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      setSupplies(data);
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig, debouncedSearchTerm]);

  useEffect(() => { fetchSupplies(); }, [fetchSupplies]);
  useEffect(() => { setPage(0); }, [debouncedSearchTerm]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0);
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return null;
    return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
  };
  
  const handleOpenEditModal = (supply) => {
    setSupplyToEdit(supply);
    setIsEditModalOpen(true);
  };

  const handleOpenAdjustModal = (supply, actionType) => {
    setSupplyToAdjust(supply);
    setAdjustActionType(actionType);
    setIsAdjustModalOpen(true);
  };

  const handleSaveSupply = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_supply', {
      p_supply_id: supplyToEdit?.id || null, p_name: formData.name,
      p_description: formData.description, p_initial_stock: formData.initial_stock,
    });
    if (error) toast.error(handleSupabaseError(error));
    else {
      toast.success(`Material ${supplyToEdit ? 'atualizado' : 'criado'}!`);
      setIsEditModalOpen(false);
      fetchSupplies();
    }
    setIsSaving(false);
  };

  const handleLogAndAdjustStock = async ({ quantity, reason }) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('log_and_adjust_stock', {
      p_supply_id: supplyToAdjust.id,
      p_quantity_change: quantity,
      p_reason: reason
    });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Estoque ajustado com sucesso!');
      setIsAdjustModalOpen(false);
      fetchSupplies();
    }
    setIsSaving(false);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={styles.container}>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={supplyToEdit ? 'Editar Material' : 'Adicionar Novo Material'}>
        <SupplyForm onSave={handleSaveSupply} onClose={() => setIsEditModalOpen(false)} supplyToEdit={supplyToEdit} loading={isSaving} />
      </Modal>

      {supplyToAdjust && (
        <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="">
          <AdjustStockForm 
            onSave={handleLogAndAdjustStock} 
            onClose={() => setIsAdjustModalOpen(false)} 
            supplyName={supplyToAdjust.name}
            actionType={adjustActionType}
            loading={isSaving} 
          />
        </Modal>
      )}

      <header className={styles.header}>
        <h1>Material de Expediente</h1>
        <div className={styles.actions}>
          <Input id="search" placeholder="Buscar por nome..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Button onClick={() => { setSupplyToEdit(null); setIsEditModalOpen(true); }}><FaPlus /> Novo Material</Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        {loading ? (
          <TableSkeleton columns={4} rows={ITEMS_PER_PAGE} />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortableHeader} onClick={() => requestSort('name')}>Nome do Material {getSortIcon('name')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('description')}>Descrição {getSortIcon('description')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('stock')}>Estoque Atual {getSortIcon('stock')}</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {supplies.length > 0 ? (
                supplies.map(supply => (
                <tr key={supply.id}>
                  <td data-label="Nome">{supply.name}</td>
                  <td data-label="Descrição">{supply.description || 'N/A'}</td>
                  <td data-label="Estoque">
                    <div className={styles.stockCell}>
                      <button className={`${styles.actionButton} ${styles.removeStock}`} title="Remover Estoque" onClick={() => handleOpenAdjustModal(supply, 'remove')} disabled={supply.stock <= 0}>
                        <FaMinusCircle />
                      </button>
                      <span className={styles.stockValue}>{supply.stock}</span>
                      <button className={`${styles.actionButton} ${styles.addStock}`} title="Adicionar Estoque" onClick={() => handleOpenAdjustModal(supply, 'add')}>
                        <FaPlusCircle />
                      </button>
                    </div>
                  </td>
                  <td data-label="Ações">
                    <div className={styles.actionButtons}>
                      <button className={styles.actionButton} title="Ver Histórico" onClick={() => navigate(`/supplies/${supply.id}/log`)}>
                        <FaHistory />
                      </button>
                      <button className={styles.actionButton} title="Editar Detalhes" onClick={() => handleOpenEditModal(supply)}>
                        <FaEdit />
                      </button>
                    </div>
                  </td>
                </tr>
              ))) : (
                <tr>
                  <td colSpan="4">
                    <EmptyState
                      icon={FaClipboardList}
                      title={debouncedSearchTerm ? "Nenhum resultado" : "Nenhum material"}
                      message={
                        debouncedSearchTerm
                          ? <>Nenhum material encontrado para a busca <strong>"{debouncedSearchTerm}"</strong>.</>
                          : "Ainda não há materiais de expediente cadastrados."
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

export default SuppliesPage;
