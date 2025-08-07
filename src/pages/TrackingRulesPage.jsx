// path: src/pages/TrackingRulesPage.jsx
// CORREÇÃO (BUG-02): O payload enviado para a função `create_or_update_tracking_rule`
// foi ajustado para corresponder aos novos nomes de parâmetros (com prefixo p_).

import React, { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css';
import { FaPlus, FaEdit, FaTrashAlt, FaRulerCombined } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TrackingRuleForm from '../components/TrackingRuleForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import useResourceManagement from '../hooks/useResourceManagement';

const TrackingRulesPage = () => {
  const fetchRulesFn = useCallback(async ({ sortConfig }) => {
    const { data, error } = await supabase
      .from('tracking_code_rules')
      .select('*')
      .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
    
    if (error) return { error };
    return { data, count: data?.length || 0 };
  }, []);

  const {
    data: rules,
    loading,
    isSaving,
    setIsSaving,
    isModalOpen,
    itemToEdit: ruleToEdit,
    isConfirmModalOpen,
    itemToDelete: ruleToDelete,
    fetchData: fetchRules,
    handleOpenModal,
    handleCloseModal,
    handleStartDelete: startDeleteRule,
    handleCloseConfirmModal,
  } = useResourceManagement({ key: 'prefix', direction: 'asc' }, fetchRulesFn);

  const handleSaveRule = async (formData) => {
    setIsSaving(true);
    // [CORREÇÃO APLICADA AQUI]
    const payload = {
      p_rule_id: ruleToEdit?.id || null,
      p_prefix: formData.prefix,
      p_object_type: formData.object_type,
      p_storage_days: formData.storage_days
    };
    const { error } = await supabase.rpc('create_or_update_tracking_rule', payload);
    if (error) toast.error(handleSupabaseError(error));
    else {
      toast.success('Regra salva com sucesso!');
      handleCloseModal();
      fetchRules();
    }
    setIsSaving(false);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsSaving(true);
    const { error } = await supabase.rpc('delete_tracking_rule', { p_rule_id: ruleToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Regra apagada.');
      fetchRules();
    }
    setIsSaving(false);
    handleCloseConfirmModal();
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={ruleToEdit ? 'Editar Regra' : 'Nova Regra de Rastreio'}>
        <TrackingRuleForm onSave={handleSaveRule} onClose={handleCloseModal} ruleToEdit={ruleToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={confirmDeleteRule}
        title="Confirmar Exclusão"
        loading={isSaving}
      >
        <p>Tem certeza que deseja apagar a regra com o prefixo <strong>{ruleToDelete?.prefix}</strong>?</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Regras de Rastreamento</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Nova Regra</Button>
      </header>

      <div className={styles.tableContainer}>
        {loading ? (
          <TableSkeleton columns={4} rows={5} />
        ) : (
          <table className={styles.table}>
            <thead><tr><th>Prefixo</th><th>Tipo de Objeto</th><th>Prazo de Guarda</th><th>Ações</th></tr></thead>
            <tbody>
              {rules.length > 0 ? (
                rules.map(rule => (
                <tr key={rule.id}>
                  <td data-label="Prefixo">{rule.prefix}</td>
                  <td data-label="Tipo de Objeto">{rule.object_type}</td>
                  <td data-label="Prazo de Guarda">{rule.storage_days} dias</td>
                  <td data-label="Ações">
                    <div className={styles.actionButtons}>
                      <button className={styles.actionButton} onClick={() => handleOpenModal(rule)}><FaEdit /></button>
                      <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => startDeleteRule(rule)}><FaTrashAlt /></button>
                    </div>
                  </td>
                </tr>
              ))) : (
                <tr>
                  <td colSpan="4">
                    <EmptyState icon={FaRulerCombined} title="Nenhuma regra" message="Ainda não há regras de rastreamento cadastradas." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TrackingRulesPage;
