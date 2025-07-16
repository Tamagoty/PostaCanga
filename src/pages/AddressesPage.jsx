// Arquivo: src/pages/AddressesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import AddressForm from '../components/AddressForm';

const AddressesPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    // Consulta atualizada para buscar os nomes da cidade e estado
    const { data, error } = await supabase.from('addresses').select('*, city:cities(name, state:states(uf))').order('street_name');
    if (error) toast.error('Erro ao buscar endereços: ' + error.message);
    else setAddresses(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleOpenModal = (address = null) => {
    setAddressToEdit(address);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_address', formData);
    if (error) toast.error(`Erro ao salvar: ${error.message}`);
    else {
      toast.success('Endereço salvo com sucesso!');
      setIsModalOpen(false);
      fetchAddresses();
    }
    setIsSaving(false);
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Tem certeza? Apagar um endereço só é possível se ele não estiver em uso.')) return;
    const { error } = await supabase.rpc('delete_address', { p_address_id: addressId });
    if (error) toast.error(`Erro ao apagar: ${error.message}`);
    else { toast.success('Endereço apagado.'); fetchAddresses(); }
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={addressToEdit ? 'Editar Endereço' : 'Novo Endereço'}>
        <AddressForm onSave={handleSaveAddress} onClose={() => setIsModalOpen(false)} addressToEdit={addressToEdit} loading={isSaving} />
      </Modal>

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
                    <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => handleDeleteAddress(addr.id)}><FaTrashAlt /></button>
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
