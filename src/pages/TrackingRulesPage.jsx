// Arquivo: src/pages/TrackingRulesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css'; // Reutilizando estilos
import { FaPlus, FaEdit, FaTrashAlt } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TrackingRuleForm from '../components/TrackingRuleForm';

const TrackingRulesPage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tracking_code_rules').select('*').order('prefix');
    if (error) toast.error('Erro ao buscar regras: ' + error.message);
    else setRules(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleOpenModal = (rule = null) => {
    setRuleToEdit(rule);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_tracking_rule', formData);
    if (error) toast.error(`Erro ao salvar: ${error.message}`);
    else { toast.success('Regra salva com sucesso!'); setIsModalOpen(false); fetchRules(); }
    setIsSaving(false);
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Tem certeza que deseja apagar esta regra?')) return;
    const { error } = await supabase.rpc('delete_tracking_rule', { p_rule_id: ruleId });
    if (error) toast.error(`Erro ao apagar: ${error.message}`);
    else { toast.success('Regra apagada.'); fetchRules(); }
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={ruleToEdit ? 'Editar Regra' : 'Nova Regra de Rastreio'}>
        <TrackingRuleForm onSave={handleSaveRule} onClose={() => setIsModalOpen(false)} ruleToEdit={ruleToEdit} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Regras de Rastreamento</h1>
        <Button onClick={() => handleOpenModal()}><FaPlus /> Nova Regra</Button>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead><tr><th>Prefixo</th><th>Tipo de Objeto</th><th>Prazo de Guarda</th><th>Ações</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan="4">A carregar...</td></tr>)
            : rules.map(rule => (
              <tr key={rule.id}>
                <td data-label="Prefixo">{rule.prefix}</td>
                <td data-label="Tipo de Objeto">{rule.object_type}</td>
                <td data-label="Prazo de Guarda">{rule.storage_days} dias</td>
                <td data-label="Ações">
                  <div className={styles.actionButtons}>
                    <button className={styles.actionButton} onClick={() => handleOpenModal(rule)}><FaEdit /></button>
                    <button className={`${styles.actionButton} ${styles.removeStock}`} onClick={() => handleDeleteRule(rule.id)}><FaTrashAlt /></button>
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

// CORREÇÃO: Adicionada a exportação padrão que estava em falta.
export default TrackingRulesPage;
