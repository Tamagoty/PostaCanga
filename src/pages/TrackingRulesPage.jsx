// Arquivo: src/pages/TrackingRulesPage.jsx
// MELHORIA (v4): Implementado o Skeleton Loader para a tabela.

import React, { useState, useEffect, useCallback } from 'react';
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

const TrackingRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tracking_code_rules').select('*').order('prefix');
    if (error) toast.error(handleSupabaseError(error));
    else setRules(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleOpenModal = (rule = null) => {
    setRuleToEdit(rule);
    setIsFormModalOpen(true);
  };

  const handleSaveRule = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_tracking_rule', formData);
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Regra salva com sucesso!'); setIsFormModalOpen(false); fetchRules(); }
    setIsSaving(false);
  };

  const startDeleteRule = (rule) => {
    setRuleToDelete(rule);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_tracking_rule', { p_rule_id: ruleToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Regra apagada.');
      fetchRules();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setRuleToDelete(null);
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={ruleToEdit ? 'Editar Regra' : 'Nova Regra de Rastreio'}>
        <TrackingRuleForm onSave={handleSaveRule} onClose={() => setIsFormModalOpen(false)} ruleToEdit={ruleToEdit} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteRule}
        title="Confirmar Exclusão"
        loading={isDeleting}
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
