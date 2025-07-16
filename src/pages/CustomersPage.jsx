// Arquivo: src/pages/CustomersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './CustomersPage.module.css';
import { FaSearch, FaPlus, FaEye, FaUserCircle, FaPhoneAlt, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import ToggleSwitch from '../components/ToggleSwitch';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 20;

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);

    const { data: count, error: countError } = await supabase.rpc('count_customers_filtered', {
        p_search_term: searchTerm,
        p_status_filter: statusFilter
    });

    if (countError) {
      toast.error('Erro ao contar clientes: ' + countError.message);
      setLoading(false);
      return;
    }
    setTotalCount(count || 0);

    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let dataQuery = supabase
      .from('customers')
      .select('*, addresses(*, city:cities(name, state:states(uf))), contact:contact_customer_id(full_name)');

    if (searchTerm) {
      // CORREÇÃO: A busca agora utiliza o operador 'or' para procurar em múltiplos campos.
      const searchPattern = `%${searchTerm}%`;
      dataQuery = dataQuery.or(`full_name.ilike.${searchPattern},cpf.ilike.${searchPattern},cellphone.ilike.${searchPattern}`);
    }
    if (statusFilter !== 'all') {
      dataQuery = dataQuery.eq('is_active', statusFilter === 'active');
    }

    dataQuery = dataQuery.range(from, to).order('full_name', { ascending: true });

    const { data, error: dataError } = await dataQuery;

    if (dataError) {
      toast.error('Erro ao buscar clientes: ' + dataError.message);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter]);

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const payload = {
      p_customer_id: customerToEdit?.id || null, p_full_name: formData.full_name,
      p_cpf: formData.cpf ? formData.cpf : null, p_cellphone: formData.cellphone ? formData.cellphone : null,
      p_birth_date: formData.birth_date || null, p_contact_customer_id: formData.contact_customer_id || null,
      p_email: formData.email ? formData.email : null, p_address_id: formData.address_id || null,
      p_address_number: formData.address_number || null, p_address_complement: formData.address_complement || null
    };
    const { error } = await supabase.rpc('create_or_update_customer', payload);
    if (error) { toast.error(`Erro ao salvar: ${error.message}`); }
    else { toast.success(`Cliente ${customerToEdit ? 'atualizado' : 'criado'}!`); setIsModalOpen(false); fetchCustomers(); }
    setIsSaving(false);
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = !customer.is_active;
    const toastId = toast.loading(`${newStatus ? 'Ativando' : 'Desativando'} cliente...`);
    const { error } = await supabase.rpc('set_customer_status', { p_customer_id: customer.id, p_is_active: newStatus });
    if (error) { toast.error(`Erro: ${error.message}`, { id: toastId }); }
    else { toast.success('Status atualizado!', { id: toastId }); fetchCustomers(); }
  };

  const handlePageJump = (e) => {
    e.preventDefault();
    const targetPage = parseInt(pageInput, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      setPage(targetPage - 1);
    } else {
      toast.error(`Por favor, insira um número de página entre 1 e ${totalPages}.`);
    }
    setPageInput('');
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={customerToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}>
        <CustomerForm onSave={handleSaveCustomer} onClose={() => setIsModalOpen(false)} customerToEdit={customerToEdit} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Clientes</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}>
            {/* CORREÇÃO: Atualizado o placeholder para refletir as novas capacidades de busca. */}
            <Input id="search" placeholder="Buscar por nome, CPF ou celular..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <Button variant={statusFilter === 'active' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('active')}>Ativos</Button>
            <Button variant={statusFilter === 'inactive' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('inactive')}>Inativos</Button>
            <Button variant={statusFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setStatusFilter('all')}>Todos</Button>
          </div>
          <Button onClick={() => { setCustomerToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Cliente</Button>
        </div>
      </header>

      <div className={styles.grid}>
        {loading ? (<p>A carregar clientes...</p>) 
        : customers.length > 0 ? (
          customers.map(customer => (
            <div key={customer.id} className={`${styles.card} ${!customer.is_active ? styles.inactive : ''}`}>
              <div className={styles.cardHeader}><FaUserCircle className={styles.cardIcon} /><h3 className={styles.cardTitle}>{customer.full_name}</h3></div>
              <div className={styles.cardBody}>
                <p><strong>CPF:</strong> {customer.cpf || 'Não informado'}</p>
                {customer.cellphone ? (<p><strong>Celular:</strong> {customer.cellphone}</p>) 
                : customer.contact ? (<p className={styles.contactInfo}><FaPhoneAlt /> <span>Contato por: <strong>{customer.contact.full_name}</strong></span></p>) 
                : (<p><strong>Celular:</strong> Não informado</p>)}
                <p><strong>Endereço:</strong> {customer.addresses ? `${customer.addresses.street_name}, ${customer.address_number || 'S/N'}` : 'Não informado'}</p>
              </div>
              <div className={styles.cardFooter}>
                <ToggleSwitch id={`toggle-${customer.id}`} checked={customer.is_active} onChange={() => handleToggleStatus(customer)} />
                <button className={styles.actionButton} onClick={() => navigate(`/customers/${customer.id}`)}><FaEye /> Detalhes</button>
              </div>
            </div>
          ))
        ) : (<p>Nenhum cliente encontrado para os filtros selecionados.</p>)}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button onClick={() => setPage(p => p - 1)} disabled={page === 0}><FaArrowLeft /> Anterior</Button>
          <form onSubmit={handlePageJump} className={styles.pageJumpForm}>
            <span>Página</span>
            <div className={styles.pageInputWrapper}>
              <div className={styles.pageInput}>
                <Input
                  type="number"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder={`${page + 1}`}
                />
              </div>
            </div>
            <span>de {totalPages}</span>
          </form>
          <Button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}><FaArrowRight /> Próxima</Button>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
