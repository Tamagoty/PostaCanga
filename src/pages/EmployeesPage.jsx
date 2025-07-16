// Arquivo: src/pages/EmployeesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './EmployeesPage.module.css';
import { FaPlus, FaTrashAlt, FaUserShield, FaUser } from 'react-icons/fa';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmployeeForm from '../components/EmployeeForm';

const EmployeesPage = () => {
  const { isAdmin, userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Etapa 1: Buscar os perfis dos funcionários.
    const { data: profiles, error: profileError } = await supabase.rpc('get_employee_profiles');
    if (profileError) {
      toast.error('Erro ao buscar perfis: ' + profileError.message);
      setLoading(false);
      return;
    }

    // Etapa 2: Buscar os dados de autenticação (e-mails).
    // ATENÇÃO: Esta chamada requer que o usuário seja um "Super Admin" no Supabase.
    // Se ocorrer um erro aqui, verifique as permissões no seu projeto Supabase.
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      toast.error('Erro ao buscar e-mails: ' + usersError.message);
      setLoading(false);
      return;
    }

    // Etapa 3: Juntar os dados no frontend.
    const combinedData = profiles.map(profile => {
      const authUser = users.find(user => user.id === profile.id);
      return {
        ...profile,
        email: authUser ? authUser.email : 'Não encontrado',
      };
    });

    setEmployees(combinedData);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreateEmployee = async (formData) => {
    setIsSaving(true);
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      toast.error(`Erro de autenticação: ${authError.message}`);
      setIsSaving(false);
      return;
    }

    if (user) {
      const { error: profileError } = await supabase
        .from('employees')
        .update({
          full_name: formData.full_name,
          registration_number: formData.registration_number,
          role: formData.role,
        })
        .eq('id', user.id);

      if (profileError) {
        toast.error(`Erro ao atualizar perfil: ${profileError.message}`);
      } else {
        toast.success('Funcionário criado com sucesso!');
        setIsModalOpen(false);
        fetchEmployees();
      }
    }
    setIsSaving(false);
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Tem certeza que deseja apagar ${employeeName}? Esta ação é irreversível.`)) return;
    
    const toastId = toast.loading('Apagando funcionário...');
    const { error } = await supabase.rpc('delete_employee', { p_user_id: employeeId });

    if (error) {
      toast.error(`Erro: ${error.message}`, { id: toastId });
    } else {
      toast.success('Funcionário apagado.', { id: toastId });
      fetchEmployees();
    }
  };

  if (!isAdmin) {
    return <div className={styles.container}><h1>Acesso Negado</h1><p>Você não tem permissão para ver esta página.</p></div>;
  }

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Funcionário">
        <EmployeeForm onSave={handleCreateEmployee} onClose={() => setIsModalOpen(false)} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Gestão de Funcionários</h1>
        <div className={styles.actions}>
          <Button onClick={() => setIsModalOpen(true)}><FaPlus /> Novo Funcionário</Button>
        </div>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome Completo</th>
              <th>Matrícula</th>
              <th>E-mail</th>
              <th>Permissão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">A carregar funcionários...</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.id}>
                <td data-label="Nome">{emp.full_name}</td>
                <td data-label="Matrícula">{emp.registration_number}</td>
                <td data-label="E-mail">{emp.email}</td>
                <td data-label="Permissão">
                  <span className={`${styles.role} ${styles[emp.role]}`}>
                    {emp.role === 'admin' ? <FaUserShield /> : <FaUser />} {emp.role}
                  </span>
                </td>
                <td data-label="Ações">
                  {userProfile?.id !== emp.id && (
                    <button className={styles.deleteButton} onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}>
                      <FaTrashAlt />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeesPage;
