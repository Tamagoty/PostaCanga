// path: src/hooks/useAddresses.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';

/**
 * Custom Hook para gerenciar a busca, paginação, ordenação e filtro de endereços.
 */
export const useAddresses = ({ cityFilter, neighborhoodFilter, debouncedSearchTerm, itemsPerPage }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'street_name', direction: 'asc' });

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('addresses_with_customer_count').select('*', { count: 'exact' });

      if (cityFilter) query = query.eq('city_id', cityFilter);
      if (neighborhoodFilter) query = query.eq('neighborhood', neighborhoodFilter);
      if (debouncedSearchTerm) query = query.or(`street_name.ilike.%${debouncedSearchTerm}%,cep.ilike.%${debouncedSearchTerm}%`);

      const from = page * itemsPerPage;
      const to = from + itemsPerPage - 1;

      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' }).range(from, to);
        
      const { data, error, count } = await query;
      if (error) throw error;
      
      setAddresses(data);
      setTotalCount(count ?? 0);

    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig, cityFilter, neighborhoodFilter, debouncedSearchTerm, itemsPerPage]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Reseta a página quando os filtros ou itens por página mudam
  useEffect(() => {
    setPage(0);
  }, [cityFilter, neighborhoodFilter, debouncedSearchTerm, itemsPerPage]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return {
    addresses,
    loading,
    totalCount,
    page,
    setPage,
    sortConfig,
    requestSort,
    totalPages,
    refetch: fetchAddresses,
  };
};
