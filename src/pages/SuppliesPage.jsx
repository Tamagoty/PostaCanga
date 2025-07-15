// Arquivo: src/pages/SuppliesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaPlusCircle, FaMinusCircle } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SupplyForm from '../components/SupplyForm';

const SuppliesPage = () => {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplyToEdit, setSupplyToEdit] = useState(null);

  const fetchSupplies = useCallback(async () => {
    setLoading(true);
    let { data, error } = await supabase
      .from('office_supplies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Erro ao buscar materiais: ' + error.message);
    } else {
      setSupplies(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  const handleOpenModalForNew = () => {
    setSupplyToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (supply) => {
    setSupplyToEdit(supply);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSupplyToEdit(null);
  };

  const handleSaveSupply = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_supply', {
      p_supply_id: formData.p_supply_id,
      p_name: formData.name,
      p_description: formData.description,
      p_initial_stock: formData.initial_stock,
    });

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } else {
      toast.success(`Material ${supplyToEdit ? 'atualizado' : 'criado'}!`);
      handleCloseModal();
      fetchSupplies();
    }
    setIsSaving(false);
  };

  const handleAdjustStock = async (supplyId, quantity) => {
    const { error } = await supabase.rpc('adjust_supply_stock', {
      p_supply_id: supplyId,
      p_quantity_change: quantity,
    });

    if (error) {
      toast.error(`Erro ao ajustar estoque: ${error.message}`);
    } else {
      toast.success('Estoque atualizado!');
      fetchSupplies();
    }
  };

  const filteredSupplies = supplies.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={supplyToEdit ? 'Editar Material' : 'Adicionar Novo Material'}
      >
        <SupplyForm
          onSave={handleSaveSupply}
          onClose={handleCloseModal}
          supplyToEdit={supplyToEdit}
          loading={isSaving}
        />
      </Modal>

      <header className={styles.header}>
        <h1>Material de Expediente</h1>
        <div className={styles.actions}>
          <Input
            id="search"
            placeholder="Buscar por nome do material..."
            icon={FaSearch}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={handleOpenModalForNew}>
            <FaPlus /> Novo Material
          </Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome do Material</th>
              <th>Descrição</th>
              <th>Estoque Atual</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4">Carregando...</td></tr>
            ) : filteredSupplies.length > 0 ? (
              filteredSupplies.map(supply => (
                <tr key={supply.id}>
                  <td data-label="Nome">{supply.name}</td>
                  <td data-label="Descrição">{supply.description || 'N/A'}</td>
                  <td data-label="Estoque">
                    <div className={styles.stockCell}>
                      <button className={styles.stockButton} onClick={() => handleAdjustStock(supply.id, -1)}>
                        <FaMinusCircle />
                      </button>
                      <span className={styles.stockValue}>{supply.stock}</span>
                      <button className={styles.stockButton} onClick={() => handleAdjustStock(supply.id, 1)}>
                        <FaPlusCircle />
                      </button>
                    </div>
                  </td>
                  <td data-label="Ações">
                    <button className={styles.editButton} onClick={() => handleOpenModalForEdit(supply)}>
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4">Nenhum material encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuppliesPage;
