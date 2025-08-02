// path: src/pages/AddressesPage.jsx
// CORREÇÃO (v1.2): Implementada a busca inteligente de cidades com debounce
// e corrigida a lógica de chamada das funções RPC.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './AddressesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt, FaArrowLeft, FaArrowRight, FaArrowUp, FaArrowDown, FaMapMarkedAlt, FaSearch } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import AddressForm from '../components/AddressForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';
import { ITEMS_PER_PAGE } from '../constants';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import useDebounce from '../hooks/useDebounce';

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
  const [sortConfig, setSortConfig] = useState({ key: 'street_name', direction: 'asc', referencedTable: null });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Estados para o filtro de cidade inteligente
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const debouncedCitySearch = useDebounce(citySearchTerm, 500);
  
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');

  // Busca cidades dinamicamente
  useEffect(() => {
    if (debouncedCitySearch.length < 2) {
      setCityResults([]);
      return;
    }
    const searchCities = async () => {
      const { data, error } = await supabase.rpc('search_cities', { p_search_term: debouncedCitySearch });
      if (error) {
        toast.error(handleSupabaseError(error));
      } else {
        setCityResults(data || []);
      }
    };
    searchCities();
  }, [debouncedCitySearch]);

  // Busca bairros quando uma cidade é selecionada
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

  // Busca a lista principal de endereços
  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const { data: count, error: countError } = await supabase.rpc('count_addresses', {
        p_city_id: cityFilter || null,
        p_neighborhood: neighborhoodFilter || null,
        p_search_term: debouncedSearchTerm || null
      });
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from('addresses').select('*, city:cities(name, state:states(uf))');
      if (cityFilter) query = query.eq('city_id', cityFilter);
      if (neighborhoodFilter) query = query.eq('neighborhood', neighborhoodFilter);
      if (debouncedSearchTerm) query = query.or(`street_name.ilike.%${debouncedSearchTerm}%,cep.ilike.%${debouncedSearchTerm}%`);

      query = query.order(sortConfig.key, {
          ascending: sortConfig.direction === 'asc',
          referencedTable: sortConfig.referencedTable,
        })
        .range(from, to);
        
      const { data, error } = await query;
      if (error) throw error;
      
      setAddresses(data);
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig, cityFilter, neighborhoodFilter, debouncedSearchTerm]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);
  useEffect(() => { setPage(0); }, [cityFilter, neighborhoodFilter, debouncedSearchTerm]);

  const handleSelectCity = (city) => {
    setCityFilter(city.id);
    setSelectedCityName(`${city.name} - ${city.uf}`);
    setCitySearchTerm(`${city.name} - ${city.uf}`);
    setCityResults([]);
  };

  const requestSort = (key, referencedTable = null) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction, referencedTable });
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
    const payload = {
      p_address_id: addressToEdit?.id || null, p_cep: formData.cep,
      p_street_name: formData.street_name, p_neighborhood: formData.neighborhood,
      p_city_id: formData.city_id
    };
    const { error } = await supabase.rpc('create_or_update_address', payload);
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
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Endereço apagado.'); fetchAddresses(); }
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

      <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={confirmDeleteAddress} title="Confirmar Exclusão" loading={isDeleting}>
        <p>Tem a certeza que deseja apagar o endereço <strong>{addressToDelete?.street_name}</strong>?</p>
        <p>Esta ação só funcionará se o endereço não estiver em uso por nenhum cliente.</p>
      </ConfirmationModal>

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
        {loading ? <TableSkeleton columns={5} rows={ITEMS_PER_PAGE} /> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.sortableHeader} onClick={() => requestSort('street_name')}>Logradouro {getSortIcon('street_name')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('neighborhood')}>Bairro {getSortIcon('neighborhood')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('name', 'cities')}>Cidade/UF {getSortIcon('name')}</th>
                <th className={styles.sortableHeader} onClick={() => requestSort('cep')}>CEP {getSortIcon('cep')}</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {addresses.length > 0 ? (
                addresses.map(addr => (
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
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState 
                      icon={FaMapMarkedAlt} 
                      title={searchTerm || cityFilter ? "Nenhum resultado" : "Nenhum endereço"}
                      message={searchTerm || cityFilter ? "Nenhum endereço encontrado para os filtros selecionados." : "Ainda não há endereços cadastrados."}
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
          <Button onClick={() => setPage(p => p - 1)} disabled={page === 0}><FaArrowLeft /> Anterior</Button>
          <span className={styles.pageInfo}>Página {page + 1} de {totalPages}</span>
          <Button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}>Próxima <FaArrowRight /></Button>
        </div>
      )}
    </div>
  );
};

export default AddressesPage;
