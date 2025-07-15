// Arquivo: src/pages/EmployeesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './SuppliesPage.module.css'; // Reutilizando estilos
import { FaPlus, FaTrashAlt, FaUserShield } from 'react-icons/fa';
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
    if (!isAdmin) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('list_all_employees');
    if (error) {
      toast.error('Erro ao buscar funcionários: ' + error.message);
    } else {
      setEmployees(data);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreateEmployee = async (formData) => {
    setIsSaving(true);
    // ATENÇÃO: Esta é uma chamada insegura e é apenas um placeholder.
    // A criação de usuários deve ser feita via Edge Function no ambiente de produção.
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      toast.error(`Erro de autenticação: ${authError.message}`);
      setIsSaving(false);
      return;
    }

    // Se o usuário foi criado na auth, insere na tabela public.employees
    if (user) {
      const { error: profileError } = await supabase.from('employees').insert({
        id: user.id,
        full_name: formData.full_name,
        registration_number: formData.registration_number,
        role: formData.role,
      });

      if (profileError) {
        toast.error(`Erro ao criar perfil: ${profileError.message}`);
        // Idealmente, aqui deveria haver uma lógica para deletar o usuário da auth que acabou de ser criado.
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
              <tr><td colSpan="5">Carregando...</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.id}>
                <td data-label="Nome">{emp.full_name}</td>
                <td data-label="Matrícula">{emp.registration_number}</td>
                <td data-label="E-mail">{emp.email}</td>
                <td data-label="Permissão">
                  <span className={`${styles.role} ${styles[emp.role]}`}>
                    {emp.role === 'admin' && <FaUserShield />} {emp.role}
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
