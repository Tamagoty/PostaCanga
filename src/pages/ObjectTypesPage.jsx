// Arquivo: src/pages/ObjectTypesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectTypeForm from '../components/ObjectTypeForm';

const ObjectTypesPage = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState(null);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('object_types').select('*').order('name');
    if (error) toast.error('Erro ao buscar tipos: ' + error.message);
    else setTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const handleOpenModal = (type = null) => {
    setTypeToEdit(type);
    setIsModalOpen(true);
  };

  const handleSaveType = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_object_type', formData);
    if (error) toast.error(`Erro ao salvar: ${error.message}`);
    else { toast.success('Tipo de objeto salvo!'); setIsModalOpen(false); fetchTypes(); }
    setIsSaving(false);
  };

  const handleDeleteType = async (typeId) => {
    if (!window.confirm('Tem certeza que deseja apagar este tipo?')) return;
    const { error } = await supabase.rpc('delete_object_type', { p_type_id: typeId });
    if (error) toast.error(`Erro ao apagar: ${error.message}`);
    else { toast.success('Tipo apagado.'); fetchTypes(); }
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={typeToEdit ? 'Editar Tipo' : 'Novo Tipo de Objeto'}>
        <ObjectTypeForm onSave={handleSaveType} onClose={() => setIsModalOpen(false)} typeToEdit={typeToEdit} loading={isSaving} />
      </Modal>

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
                    <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => handleDeleteType(type.id)}><FaTrashAlt /></button>
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
