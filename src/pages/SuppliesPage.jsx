// Arquivo: src/pages/SuppliesPage.jsx
// MELHORIA (v3): Implementado o `handleSupabaseError`.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaPlusCircle, FaMinusCircle, FaHistory } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SupplyForm from '../components/SupplyForm';
import AdjustStockForm from '../components/AdjustStockForm';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import { handleSupabaseError } from '../utils/errorHandler';

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

  const fetchSupplies = useCallback(async () => {
    setLoading(true);
    let { data, error } = await supabase.from('office_supplies').select('*').order('name', { ascending: true });
    if (error) toast.error(handleSupabaseError(error));
    else setSupplies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

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
      p_supply_id: formData.p_supply_id, p_name: formData.name,
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

  const filteredSupplies = supplies.filter(s => 
    s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

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
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome do Material</th><th>Descrição</th><th>Estoque Atual</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan="4">A carregar...</td></tr>) 
            : filteredSupplies.map(supply => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliesPage;
