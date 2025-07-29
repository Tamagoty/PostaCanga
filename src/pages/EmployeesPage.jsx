// Arquivo: src/pages/EmployeesPage.jsx
// MELHORIA (v3.1): Adicionada tradução para os nomes das permissões.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './EmployeesPage.module.css';
import { FaPlus, FaTrashAlt, FaUserShield, FaUser } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmployeeForm from '../components/EmployeeForm';
import ConfirmationModal from '../components/ConfirmationModal';
import { handleSupabaseError } from '../utils/errorHandler';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';

// 1. Objeto para traduzir os papéis de permissão
const roleLabels = {
  admin: 'Administrador',
  employee: 'Funcionário',
};

const EmployeesPage = () => {
  const { isAdmin, userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('get-employees');
    if (error) {
      toast.error(handleSupabaseError(error));
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleCreateEmployee = async (formData) => {
    setIsSaving(true);
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });
    if (authError) {
      toast.error(handleSupabaseError(authError));
      setIsSaving(false);
      return;
    }
    if (user) {
      const { error: profileError } = await supabase.from('employees').update({
        full_name: formData.full_name,
        registration_number: formData.registration_number,
        role: formData.role,
      }).eq('id', user.id);
      if (profileError) {
        toast.error(handleSupabaseError(profileError));
      } else {
        toast.success('Funcionário criado com sucesso!');
        setIsFormModalOpen(false);
        fetchEmployees();
      }
    }
    setIsSaving(false);
  };

  const startDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading('A apagar funcionário...');
    const { error } = await supabase.rpc('delete_employee', { p_user_id: employeeToDelete.id });
    if (error) {
      toast.error(handleSupabaseError(error), { id: toastId });
    } else {
      toast.success('Funcionário apagado.', { id: toastId });
      fetchEmployees();
    }
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setEmployeeToDelete(null);
  };

  if (!isAdmin) {
    return <div className={styles.container}><h1>Acesso Negado</h1><p>Você não tem permissão para ver esta página.</p></div>;
  }

  return (
    <div className={styles.container}>
      <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="Novo Funcionário">
        <EmployeeForm onSave={handleCreateEmployee} onClose={() => setIsFormModalOpen(false)} loading={isSaving} />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDeleteEmployee}
        title="Confirmar Exclusão"
        loading={isDeleting}
      >
        <p>Tem a certeza que deseja apagar o funcionário <strong>{employeeToDelete?.full_name}</strong>?</p>
        <p>Esta ação é irreversível.</p>
      </ConfirmationModal>

      <header className={styles.header}>
        <h1>Gestão de Funcionários</h1>
        <div className={styles.actions}>
          <Button onClick={() => setIsFormModalOpen(true)}><FaPlus /> Novo Funcionário</Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        {loading ? (
          <TableSkeleton columns={5} rows={5} />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome Completo</th><th>Matrícula</th><th>E-mail</th><th>Permissão</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                employees.map(emp => (
                <tr key={emp.id}>
                  <td data-label="Nome">{emp.full_name}</td>
                  <td data-label="Matrícula">{emp.registration_number}</td>
                  <td data-label="E-mail">{emp.email}</td>
                  <td data-label="Permissão">
                    <span className={`${styles.role} ${styles[emp.role]}`}>
                      {emp.role === 'admin' ? <FaUserShield /> : <FaUser />}
                      {/* 2. Usar o objeto de tradução para exibir o nome em português */}
                      {roleLabels[emp.role] || emp.role}
                    </span>
                  </td>
                  <td data-label="Ações">
                    {userProfile?.id !== emp.id && (
                      <button className={styles.deleteButton} onClick={() => startDeleteEmployee(emp)}>
                        <FaTrashAlt />
                      </button>
                    )}
                  </td>
                </tr>
              ))) : (
                <tr>
                  <td colSpan="5">
                    <EmptyState title="Nenhum funcionário" message="Ainda não há funcionários cadastrados." />
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

export default EmployeesPage;
