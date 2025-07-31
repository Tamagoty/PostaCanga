// Arquivo: src/pages/AddressesPage.jsx
// Adicionados comentários detalhados para depuração e entendimento da lógica.

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
  // --- Estados da Página ---
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

  // --- Estados dos Filtros ---
  const [cities, setCities] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [cityFilter, setCityFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // =========================================================================================
  // PASSO 1: CARREGAR DADOS INICIAIS PARA OS FILTROS
  // =========================================================================================
  // Este useEffect é executado apenas uma vez, quando a página é montada.
  // A sua função é buscar a lista de todas as cidades para preencher o dropdown de filtro
  // e pré-selecionar a cidade padrão da agência.
  useEffect(() => {
    const fetchFilterData = async () => {
      const { data, error } = await supabase.from('cities').select('id, name, state:states(uf)').order('name');
      if (error) {
        toast.error(handleSupabaseError(error));
      } else {
        setCities(data);
        const agencyCityName = import.meta.env.VITE_AGENCY_NAME.split(' de ')[1];
        const defaultCity = data.find(c => c.name === agencyCityName);
        if (defaultCity) {
          setCityFilter(defaultCity.id);
        }
      }
    };
    fetchFilterData();
  }, []);

  // =========================================================================================
  // PASSO 2: ATUALIZAR A LISTA DE BAIRROS QUANDO A CIDADE MUDA
  // =========================================================================================
  // Este useEffect "observa" a variável `cityFilter`. Sempre que o utilizador
  // seleciona uma nova cidade no filtro, este código é executado.
  useEffect(() => {
    const fetchNeighborhoods = async () => {
      // Se nenhuma cidade estiver selecionada, limpa a lista de bairros.
      if (!cityFilter) {
        setNeighborhoods([]);
        setNeighborhoodFilter('');
        return;
      }
      // Chama a função RPC `get_neighborhoods_by_city` para buscar os bairros
      // únicos da cidade selecionada.
      const { data, error } = await supabase.rpc('get_neighborhoods_by_city', { p_city_id: cityFilter });
      if (error) {
        toast.error(handleSupabaseError(error));
      } else {
        setNeighborhoods(data);
      }
    };
    fetchNeighborhoods();
  }, [cityFilter]);

  // =========================================================================================
  // PASSO 3: FUNÇÃO PRINCIPAL PARA BUSCAR OS ENDEREÇOS
  // =========================================================================================
  // Esta é a função central da página. Ela é responsável por buscar os dados
  // dos endereços, aplicando todos os filtros e a paginação.
  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      // Primeiro, contamos o número total de resultados que correspondem aos filtros.
      const { data: count, error: countError } = await supabase.rpc('count_addresses', {
        p_city_id: cityFilter || null,
        p_search_term: debouncedSearchTerm || null
      });
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Depois, construímos a consulta para buscar apenas os dados da página atual.
      let query = supabase
        .from('addresses')
        .select('*, city:cities(name, state:states(uf))');

      // Adicionamos os filtros à consulta.
      if (cityFilter) query = query.eq('city_id', cityFilter);
      if (neighborhoodFilter) query = query.eq('neighborhood', neighborhoodFilter);
      if (debouncedSearchTerm) query = query.or(`street_name.ilike.%${debouncedSearchTerm}%,cep.ilike.%${debouncedSearchTerm}%`);

      // Adicionamos a ordenação e a paginação.
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

  // Executa a busca sempre que um filtro, a página ou a ordenação mudam.
  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);
  // Volta para a primeira página sempre que um filtro muda.
  useEffect(() => { setPage(0); }, [cityFilter, neighborhoodFilter, debouncedSearchTerm]);

  // ... (demais funções permanecem iguais)

  const requestSort = (key, referencedTable = null) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction, referencedTable });
    setPage(0);
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
      p_address_id: addressToEdit?.id || null,
      p_cep: formData.cep,
      p_street_name: formData.street_name,
      p_neighborhood: formData.neighborhood,
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
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Endereço apagado.');
      fetchAddresses();
    }
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

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteAddress}
        title="Confirmar Exclusão"
        loading={isDeleting}
      >
        <p>Tem a certeza que deseja apagar o endereço <strong>{addressToDelete?.street_name}</strong>?</p>
        <p>Esta ação só funcionará se o endereço não estiver em uso por nenhum cliente.</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Gerenciamento de Endereços</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Novo Endereço</Button>
      </header>

      <div className={styles.filterContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="cityFilter">Filtrar por Cidade</label>
          <select id="cityFilter" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={styles.select}>
            <option value="">Todas as Cidades</option>
            {cities.map(city => (
              <option key={city.id} value={city.id}>{city.name} - {city.state.uf}</option>
            ))}
          </select>
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
        {loading ? (
          <TableSkeleton columns={5} rows={ITEMS_PER_PAGE} />
        ) : (
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
                      title={debouncedSearchTerm || cityFilter ? "Nenhum resultado" : "Nenhum endereço"}
                      message={
                        debouncedSearchTerm || cityFilter
                          ? "Nenhum endereço encontrado para os filtros selecionados."
                          : "Ainda não há endereços cadastrados."
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

export default AddressesPage;
