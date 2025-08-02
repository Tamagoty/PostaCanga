// path: src/pages/ObjectTypesPage.jsx
// CORREÇÃO: A página foi corrigida para usar a nova assinatura do hook useResourceManagement.

import React, { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt, FaTags } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectTypeForm from '../components/ObjectTypeForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import useResourceManagement from '../hooks/useResourceManagement';

const ObjectTypesPage = () => {
  const fetchTypesFn = useCallback(async ({ sortConfig }) => {
    const { data, error } = await supabase
      .from('object_types')
      .select('*')
      .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
    
    if (error) return { error };
    return { data, count: data?.length || 0 };
  }, []);

  const {
    data: types,
    loading,
    isSaving,
    setIsSaving,
    isModalOpen,
    itemToEdit: typeToEdit,
    isConfirmModalOpen,
    itemToDelete: typeToDelete,
    fetchData: fetchTypes,
    handleOpenModal,
    handleCloseModal,
    handleStartDelete: startDeleteType,
    handleCloseConfirmModal,
  } = useResourceManagement({ key: 'name', direction: 'asc' }, fetchTypesFn);

  const handleSaveType = async (formData) => {
    setIsSaving(true);
    const payload = {
      p_type_id: typeToEdit?.id || null,
      p_name: formData.name,
      p_default_storage_days: formData.default_storage_days
    };
    const { error } = await supabase.rpc('create_or_update_object_type', payload);
    if (error) toast.error(handleSupabaseError(error));
    else {
      toast.success('Tipo de objeto salvo!');
      handleCloseModal();
      fetchTypes();
    }
    setIsSaving(false);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.rpc('delete_object_type', { p_type_id: typeToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Tipo apagado.');
      fetchTypes();
    }
    setIsSaving(false);
    handleCloseConfirmModal();
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={typeToEdit ? 'Editar Tipo' : 'Novo Tipo de Objeto'}>
        <ObjectTypeForm onSave={handleSaveType} onClose={handleCloseModal} typeToEdit={typeToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={confirmDeleteType}
        title="Confirmar Exclusão"
        loading={isSaving}
      >
        <p>Tem a certeza que deseja apagar o tipo <strong>{typeToDelete?.name}</strong>?</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Tipos de Objeto</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Novo Tipo</Button>
      </header>

      <div className={styles.tableContainer}>
        {loading ? (
          <TableSkeleton columns={3} rows={5} />
        ) : (
          <table className={styles.table}>
            <thead><tr><th>Nome</th><th>Prazo de Guarda Padrão</th><th>Ações</th></tr></thead>
            <tbody>
              {types.length > 0 ? (
                types.map(type => (
                <tr key={type.id}>
                  <td data-label="Nome">{type.name}</td>
                  <td data-label="Prazo de Guarda">{type.default_storage_days} dias</td>
                  <td data-label="Ações">
                    <div className={styles.actionButtons}>
                      <button className={styles.actionButton} onClick={() => handleOpenModal(type)}><FaEdit /></button>
                      <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => startDeleteType(type)}><FaTrashAlt /></button>
                    </div>
                  </td>
                </tr>
              ))) : (
                <tr>
                  <td colSpan="3">
                    <EmptyState icon={FaTags} title="Nenhum tipo" message="Ainda não há tipos de objeto cadastrados." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ObjectTypesPage;
