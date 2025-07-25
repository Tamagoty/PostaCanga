// Arquivo: src/pages/ObjectTypesPage.jsx
// MELHORIA (v3): Implementado o `handleSupabaseError`.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectTypeForm from '../components/ObjectTypeForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';

const ObjectTypesPage = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('object_types').select('*').order('name');
    if (error) toast.error(handleSupabaseError(error));
    else setTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const handleOpenModal = (type = null) => {
    setTypeToEdit(type);
    setIsFormModalOpen(true);
  };

  const handleSaveType = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_object_type', formData);
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Tipo de objeto salvo!'); setIsFormModalOpen(false); fetchTypes(); }
    setIsSaving(false);
  };

  const startDeleteType = (type) => {
    setTypeToDelete(type);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_object_type', { p_type_id: typeToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Tipo apagado.');
      fetchTypes();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setTypeToDelete(null);
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={typeToEdit ? 'Editar Tipo' : 'Novo Tipo de Objeto'}>
        <ObjectTypeForm onSave={handleSaveType} onClose={() => setIsFormModalOpen(false)} typeToEdit={typeToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteType}
        title="Confirmar Exclusão"
        loading={isDeleting}
      >
        <p>Tem certeza que deseja apagar o tipo <strong>{typeToDelete?.name}</strong>?</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Tipos de Objeto</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Novo Tipo</Button>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead><tr><th>Nome</th><th>Prazo de Guarda Padrão</th><th>Ações</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan="3">A carregar...</td></tr>)
            : types.map(type => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObjectTypesPage;
