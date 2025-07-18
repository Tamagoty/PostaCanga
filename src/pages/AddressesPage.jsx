// Arquivo: src/pages/AddressesPage.jsx
// MELHORIA (v3): Implementado o `handleSupabaseError` para exibir mensagens de erro amigáveis.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import AddressForm from '../components/AddressForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler'; // 1. Importando o helper

const AddressesPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('addresses').select('*, city:cities(name, state:states(uf))').order('street_name');
    if (error) toast.error(handleSupabaseError(error)); // Usando o helper
    else setAddresses(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleOpenModal = (address = null) => {
    setAddressToEdit(address);
    setIsFormModalOpen(true);
  };

  const handleSaveAddress = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_address', formData);
    if (error) {
      toast.error(handleSupabaseError(error)); // Usando o helper
    } else {
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
      toast.error(handleSupabaseError(error)); // 2. Aplicando o helper aqui!
    } else {
      toast.success('Endereço apagado.');
      fetchAddresses();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setAddressToDelete(null);
  };

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
              <th>Logradouro</th><th>Bairro</th><th>Cidade/UF</th><th>CEP</th><th>Ações</th>
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
    </div>
  );
};

export default AddressesPage;
