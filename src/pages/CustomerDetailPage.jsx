// Arquivo: src/pages/CustomerDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './CustomerDetailPage.module.css';
import { FaArrowLeft, FaEdit, FaUser, FaMapMarkerAlt, FaPhone, FaBirthdayCake, FaIdCard, FaUsers } from 'react-icons/fa';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_customer_details', { p_customer_id: customerId });
    if (error) { toast.error('Erro ao buscar detalhes: ' + error.message); setCustomerDetails(null); }
    else { setCustomerDetails(data); }
    setLoading(false);
  }, [customerId]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_customer', {
      p_customer_id: formData.p_customer_id, p_full_name: formData.p_full_name, p_cpf: formData.p_cpf || null,
      p_cellphone: formData.p_cellphone || null, p_birth_date: formData.p_birth_date || null,
      p_contact_customer_id: formData.contact_customer_id || null, p_email: formData.email || null,
      p_address_id: formData.address_id || null, p_address_number: formData.address_number || null,
      p_address_complement: formData.address_complement || null
    });
    if (error) { toast.error(`Erro ao salvar: ${error.message}`); }
    else { toast.success('Cliente atualizado!'); setIsModalOpen(false); fetchDetails(); }
    setIsSaving(false);
  };

  if (loading) return <div className={styles.loading}>A carregar detalhes...</div>;
  if (!customerDetails?.profile) return <div className={styles.loading}>Cliente não encontrado.</div>;

  const { profile, objects, this_customer_is_contact_for, contacts_for_this_customer, main_contact_associations } = customerDetails;
  const fullAddress = profile.address ? `${profile.address.street_name}, ${profile.address_number || 'S/N'} - ${profile.address.city}/${profile.address.state}` : 'Endereço não informado';

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Editar Cliente">
        <CustomerForm onSave={handleSaveCustomer} onClose={() => setIsModalOpen(false)} customerToEdit={profile} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <Button variant="secondary" onClick={() => navigate('/customers')}><FaArrowLeft /> Voltar</Button>
        <Button onClick={() => setIsModalOpen(true)}><FaEdit /> Editar Cliente</Button>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.profileSection}>
            <div className={styles.profileCard}><FaUser className={styles.icon} /> <h3>{profile.full_name}</h3></div>
            <div className={styles.profileCard}><FaPhone className={styles.icon} /> <p>{profile.cellphone || 'Não informado'}</p></div>
            <div className={styles.profileCard}><FaIdCard className={styles.icon} /> <p>{profile.cpf || 'Não informado'}</p></div>
            <div className={styles.profileCard}><FaBirthdayCake className={styles.icon} /> <p>{profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não informado'}</p></div>
            <div className={`${styles.profileCard} ${styles.addressCard}`}>
              <FaMapMarkerAlt className={styles.icon} /><p>{fullAddress}</p>
            </div>
        </div>

        <div className={styles.associationsSection}>
            <div className={styles.associationCard}>
                <h4><FaUsers /> Associações de Contato</h4>
                {contacts_for_this_customer.length > 0 && (
                    <div className={styles.associationGroup}>
                        <p>Este cliente está associado a:</p>
                        <ul>{contacts_for_this_customer.map(c => <li key={c.id}><Link to={`/customers/${c.id}`}>{c.full_name}</Link></li>)}</ul>
                        {main_contact_associations.length > 1 && (
                            <div className={styles.subAssociation}>
                                <p>Outros associados a este contato:</p>
                                <ul>{main_contact_associations.filter(sub => sub.id !== profile.id).map(sub => <li key={sub.id}><Link to={`/customers/${sub.id}`}>{sub.full_name}</Link></li>)}</ul>
                            </div>
                        )}
                    </div>
                )}
                {this_customer_is_contact_for.length > 0 && (
                    <div className={styles.associationGroup}>
                        <p>Este cliente é o contato para:</p>
                        <ul>{this_customer_is_contact_for.map(c => <li key={c.id}><Link to={`/customers/${c.id}`}>{c.full_name}</Link></li>)}</ul>
                    </div>
                )}
                {contacts_for_this_customer.length === 0 && this_customer_is_contact_for.length === 0 && (
                    <p className={styles.noAssociation}>Nenhuma associação de contato encontrada.</p>
                )}
            </div>
        </div>
      </div>

      <div className={styles.objectsSection}>
        <h2>Histórico de Objetos</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead><tr><th>N° Controle</th><th>Tipo</th><th>Prazo de Guarda</th><th>Status</th></tr></thead>
            <tbody>
              {objects.length > 0 ? (
                objects.map(obj => (
                  <tr key={obj.control_number}>
                    <td data-label="N° Controle">{obj.control_number}</td>
                    <td data-label="Tipo">{obj.object_type}</td>
                    <td data-label="Prazo de Guarda"><ProgressBar startDate={obj.arrival_date} endDate={obj.storage_deadline} status={obj.status} /></td>
                    <td data-label="Status">{obj.status}</td>
                  </tr>
                ))
              ) : (<tr><td colSpan="4">Nenhum objeto encontrado para este cliente.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
