// path: src/pages/AddressesPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './AddressesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt, FaArrowUp, FaArrowDown, FaMapMarkedAlt, FaSearch, FaUsers } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import AddressForm from '../components/AddressForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import useDebounce from '../hooks/useDebounce';
import AddressCustomersModal from '../components/AddressCustomersModal';
import { formatCEP } from '../utils/masks';
import { useAddresses } from '../hooks/useAddresses';
import Pagination from '../components/Pagination'; // Importa o novo componente

const AddressesPage = () => {
  // Estados que permanecem no componente (relacionados a UI e modais)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [customersOfAddress, setCustomersOfAddress] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  // Estados para os filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Estados de controle da UI
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [cityResults, setCityResults] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedCityName, setSelectedCityName] = useState('');

  // Debounce para os termos de busca
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedCitySearch = useDebounce(citySearchTerm, 500);

  // Usando o nosso Custom Hook para gerenciar os dados da tabela
  const {
    addresses,
    loading,
    page,
    setPage,
    sortConfig,
    requestSort,
    totalPages,
    refetch,
  } = useAddresses({ cityFilter, neighborhoodFilter, debouncedSearchTerm, itemsPerPage });

  // Efeitos para buscar cidades e bairros (lógica de UI)
  useEffect(() => {
    if (debouncedCitySearch.length < 2) {
      setCityResults([]);
      return;
    }
    const searchCities = async () => {
      const { data, error } = await supabase.rpc('search_cities', { p_search_term: debouncedCitySearch });
      if (error) toast.error(handleSupabaseError(error));
      else setCityResults(data || []);
    };
    searchCities();
  }, [debouncedCitySearch]);

  useEffect(() => {
    const fetchNeighborhoods = async () => {
      if (!cityFilter) {
        setNeighborhoods([]);
        setNeighborhoodFilter('');
        return;
      }
      const { data, error } = await supabase.rpc('get_neighborhoods_by_city', { p_city_id: cityFilter });
      if (error) toast.error(handleSupabaseError(error));
      else setNeighborhoods(data);
    };
    fetchNeighborhoods();
  }, [cityFilter]);

  const handleSelectCity = (city) => {
    setCityFilter(city.id);
    setSelectedCityName(`${city.name} - ${city.uf}`);
    setCitySearchTerm(`${city.name} - ${city.uf}`);
    setCityResults([]);
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return null;
    return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
  };

  const handleOpenModal = (address = null) => {
    setAddressToEdit(address);
    setIsFormModalOpen(true);
  };

  const handleSaveAddress = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_address', formData);
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Endereço salvo com sucesso!');
      setIsFormModalOpen(false);
      refetch();
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
      refetch();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setAddressToDelete(null);
  };

  const handleShowCustomers = async (address) => {
    setSelectedAddress(address);
    setIsCustomersModalOpen(true);
    setLoadingCustomers(true);
    const { data, error } = await supabase.rpc('get_customers_by_address', { p_address_id: address.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      setCustomersOfAddress(data);
    }
    setLoadingCustomers(false);
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={addressToEdit ? 'Editar Endereço' : 'Novo Endereço'}>
        <AddressForm onSave={handleSaveAddress} onClose={() => setIsFormModalOpen(false)} addressToEdit={addressToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={confirmDeleteAddress} title="Confirmar Exclusão" loading={isDeleting}>
        <p>Tem a certeza que deseja apagar o endereço <strong>{addressToDelete?.street_name}</strong>?</p>
        <p>Esta ação só funcionará se o endereço não estiver em uso por nenhum cliente.</p>
      </ConfirmationModal>

      <Modal isOpen={isCustomersModalOpen} onClose={() => setIsCustomersModalOpen(false)} title="">
        <AddressCustomersModal customers={customersOfAddress} loading={loadingCustomers} address={selectedAddress} />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Endereços</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Novo Endereço</Button>
      </header>

      <div className={styles.filterContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="citySearch">Filtrar por Cidade</label>
          <div className={styles.searchWrapper}>
            <Input
              id="citySearch"
              placeholder="Digite para buscar uma cidade..."
              value={citySearchTerm}
              onChange={(e) => setCitySearchTerm(e.target.value)}
              onFocus={() => { if (selectedCityName) { setCitySearchTerm(''); setSelectedCityName(''); setCityFilter(''); } }}
            />
            {cityResults.length > 0 && (
              <ul className={styles.searchResults}>
                {cityResults.map((city) => (
                  <li key={city.id} onClick={() => handleSelectCity(city)}>
                    {city.name} - {city.uf}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="neighborhoodFilter">Filtrar por Bairro</label>
          <select id="neighborhoodFilter" value={neighborhoodFilter} onChange={(e) => setNeighborhoodFilter(e.target.value)} className={styles.select} disabled={!cityFilter || neighborhoods.length === 0}>
            <option value="">Todos os Bairros</option>
            {neighborhoods.map(n => (
              <option key={n.neighborhood} value={n.neighborhood}>{n.neighborhood}</option>
            ))}
          </select>
        </div>
        <div className={styles.searchInputWrapper}>
          <Input id="search" placeholder="Buscar por rua ou CEP..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? <TableSkeleton columns={4} rows={itemsPerPage} /> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortableHeader} onClick={() => requestSort('street_name')}>Logradouro {getSortIcon('street_name')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('city_name')}>Cidade / Bairro {getSortIcon('city_name')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('cep')}>CEP / Moradores {getSortIcon('cep')}</th>
                <th className={styles.centerAlign}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {addresses.length > 0 ? (
                addresses.map(addr => (
                  <tr key={addr.id}>
                    <td data-label="Logradouro">{addr.street_name}</td>
                    <td data-label="Cidade/Bairro">
                      <div className={styles.multiLineCell}>
                        <span>{addr.city_name ? `${addr.city_name}/${addr.state_uf}` : 'N/A'}</span>
                        <span className={styles.subText}>{addr.neighborhood || '-'}</span>
                      </div>
                    </td>
                    <td data-label="CEP/Moradores">
                      <div className={styles.multiLineCell}>
                        <span className={styles.cepCell}>{addr.cep ? formatCEP(addr.cep) : '-'}</span>
                        <span className={styles.residentsInfo}>
                          <FaUsers /> {addr.customer_count || 0}
                        </span>
                      </div>
                    </td>
                    <td data-label="Ações">
                      <div className={styles.actionButtons}>
                        <button title="Ver Moradores" className={styles.actionButton} onClick={() => handleShowCustomers(addr)}><FaUsers /></button>
                        <button title="Editar Endereço" className={styles.actionButton} onClick={() => handleOpenModal(addr)}><FaEdit /></button>
                        <button title="Apagar Endereço" className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => startDeleteAddress(addr)}><FaTrashAlt /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">
                    <EmptyState 
                      icon={FaMapMarkedAlt} 
                      title={searchTerm ? "Nenhum resultado" : "Nenhum endereço"}
                      message={searchTerm ? "Nenhum endereço encontrado para os filtros selecionados." : "Ainda não há endereços cadastrados."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default AddressesPage;

