// path: src/hooks/useResourceManagement.js
// REATORAÇÃO (v2): O hook agora é mais flexível e recebe uma função de busca (fetcher)
// como argumento, permitindo que seja usado com diferentes lógicas de busca de dados (tabelas, RPCs, etc.).

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';
import useDebounce from './useDebounce';
import { ITEMS_PER_PAGE } from '../constants';

const useResourceManagement = (initialSortConfig, fetcher) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState(initialSortConfig);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher({
        page,
        itemsPerPage: ITEMS_PER_PAGE,
        searchTerm: debouncedSearchTerm,
        sortConfig,
      });

      if (result.error) throw result.error;

      setData(result.data || []);
      setTotalCount(result.count || 0);

    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig, debouncedSearchTerm, fetcher]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, sortConfig]);

  const handleOpenModal = (item = null) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setItemToEdit(null);
    setIsModalOpen(false);
  };

  const handleStartDelete = (item) => {
    setItemToDelete(item);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setItemToDelete(null);
    setIsConfirmModalOpen(false);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    data,
    loading,
    isSaving,
    setIsSaving,
    isModalOpen,
    itemToEdit,
    isConfirmModalOpen,
    itemToDelete,
    page,
    setPage,
    totalCount,
    searchTerm,
    setSearchTerm,
    sortConfig,
    fetchData,
    handleOpenModal,
    handleCloseModal,
    handleStartDelete,
    handleCloseConfirmModal,
    requestSort,
  };
};

export default useResourceManagement;
