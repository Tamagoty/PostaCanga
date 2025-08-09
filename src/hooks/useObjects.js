// path: src/hooks/useObjects.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';

export const useObjects = ({ debouncedSearchTerm, itemsPerPage, statusFilters }) => {
  const [objects, setObjects] = useState([]);
  const [contactMap, setContactMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalObjects, setTotalObjects] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'arrival_date', direction: 'desc' });

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      const showArchived = statusFilters.has('Arquivados');
      
      // Se 'Arquivados' estiver selecionado, ignoramos os outros filtros de status.
      // Caso contrário, usamos os filtros selecionados.
      const filtersArray = showArchived 
        ? null 
        : (statusFilters.size > 0 ? Array.from(statusFilters) : []);

      const { data, error } = await supabase.rpc('get_paginated_objects', {
        p_search_term: debouncedSearchTerm,
        p_show_archived: showArchived,
        p_sort_key: sortConfig.key,
        p_sort_direction_asc: sortConfig.direction === 'asc',
        p_page_size: itemsPerPage,
        p_page_offset: (currentPage - 1) * itemsPerPage,
        p_status_filters: filtersArray
      });

      if (error) throw error;

      const currentObjects = data || [];
      setObjects(currentObjects);

      if (currentObjects.length > 0) {
        setTotalObjects(currentObjects[0].total_count || 0);
        const recipientNames = [...new Set(currentObjects.map(obj => obj.recipient_name))];
        const { data: phoneData, error: phoneError } = await supabase.rpc('get_phones_for_recipients', { p_recipient_names: recipientNames });
        if (phoneError) throw phoneError;
        setContactMap(phoneData || {});
      } else {
        setObjects([]);
        setTotalObjects(0);
        setContactMap({});
      }
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [sortConfig, debouncedSearchTerm, currentPage, itemsPerPage, statusFilters]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, itemsPerPage, statusFilters]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(totalObjects / itemsPerPage);

  return {
    objects,
    contactMap,
    loading,
    totalObjects,
    currentPage,
    setCurrentPage,
    sortConfig,
    requestSort,
    totalPages,
    refetch: fetchObjects,
  };
};
