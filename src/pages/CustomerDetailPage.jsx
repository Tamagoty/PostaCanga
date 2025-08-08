// path: src/pages/CustomerDetailPage.jsx
// VERSÃO 4: Refatorado o card de contacto para exibir o ícone do WhatsApp e ser
// um link clicável apenas se o cliente estiver ativo e tiver telemóvel.

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './CustomerDetailPage.module.css';
import { FaArrowLeft, FaEdit, FaUser, FaMapMarkerAlt, FaPhone, FaBirthdayCake, FaIdCard, FaUsers, FaTrash, FaWhatsapp } from 'react-icons/fa';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import { handleSupabaseError } from '../utils/errorHandler';
import { maskPhone } from '../utils/masks';

const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_customer_details', { p_customer_id: customerId });
    if (error) { toast.error(handleSupabaseError(error)); setCustomerDetails(null); }
    else { setCustomerDetails(data); }
    setLoading(false);
  }, [customerId]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleSaveCustomer = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_customer', formData);
    if (error) { toast.error(handleSupabaseError(error)); }
    else { toast.success('Cliente atualizado!'); setIsEditModalOpen(false); fetchDetails(); }
    setIsSaving(false);
  };

  const handleDeleteCustomer = async () => {
    setIsSaving(true);
    const { error } = await supabase.rpc('delete_customer', { p_customer_id: customerId });
    if (error) {
        toast.error(handleSupabaseError(error));
    } else {
        toast.success('Cliente excluído com sucesso!');
        navigate('/customers');
    }
    setIsSaving(false);
    setIsDeleteModalOpen(false);
  };

  if (loading) return <div className={styles.loading}>A carregar detalhes...</div>;
  if (!customerDetails?.profile) return <div className={styles.loading}>Cliente não encontrado.</div>;

  const { profile, objects, this_customer_is_contact_for, contacts_for_this_customer, main_contact_associations } = customerDetails;
  const customerToEdit = profile;
  
  const fullAddress = profile.address 
    ? `${profile.address.street_name}, ${profile.address_number || 'S/N'}` +
      `${profile.address.neighborhood ? ` - ${profile.address.neighborhood}` : ''}` +
      `\n${profile.address.city}/${profile.address.state}` +
      `${profile.address.cep ? ` - CEP: ${profile.address.cep}` : ''}`
    : 'Endereço não informado';
    
  const phoneToWhatsApp = profile.cellphone ? `55${profile.cellphone.replace(/\D/g, '')}` : null;
  const canWhatsApp = profile.is_active && phoneToWhatsApp;

  return (
    <div className={styles.container}>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Cliente">
        <CustomerForm onSave={handleSaveCustomer} onClose={() => setIsEditModalOpen(false)} customerToEdit={customerToEdit} loading={isSaving} />
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão">
        <div className={styles.deleteConfirm}>
            <p>Tem a certeza de que deseja excluir o cliente <strong>{profile.full_name}</strong>?</p>
            <p>Esta ação não pode ser desfeita.</p>
            <div className={styles.deleteActions}>
                <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={isSaving}>Cancelar</Button>
                <Button variant="danger" onClick={handleDeleteCustomer} loading={isSaving} disabled={isSaving}>
                    {isSaving ? 'A excluir...' : 'Sim, excluir'}
                </Button>
            </div>
        </div>
      </Modal>

      <header className={styles.header}>
        <Button variant="secondary" onClick={() => navigate('/customers')}><FaArrowLeft /> Voltar</Button>
        <div className={styles.headerActions}>
            <Button onClick={() => setIsEditModalOpen(true)}><FaEdit /> Editar Cliente</Button>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}><FaTrash /> Excluir Cliente</Button>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <div className={styles.profileSection}>
            <div className={styles.profileCard}><FaUser className={styles.icon} /> <h3>{profile.full_name}</h3></div>
            
            <div className={styles.profileCard}>
                {canWhatsApp ? (
                    <a href={`https://wa.me/${phoneToWhatsApp}`} target="_blank" rel="noopener noreferrer" className={styles.contactLink} title="Enviar WhatsApp">
                        <FaWhatsapp className={`${styles.icon} ${styles.whatsappIcon}`} />
                        <p>{maskPhone(profile.cellphone)}</p>
                    </a>
                ) : (
                    <>
                        <FaPhone className={styles.icon} /> 
                        <p>{profile.cellphone ? maskPhone(profile.cellphone) : 'Não informado'}</p>
                    </>
                )}
            </div>

            <div className={styles.profileCard}><FaIdCard className={styles.icon} /> <p>{profile.cpf || 'Não informado'}</p></div>
            <div className={styles.profileCard}><FaBirthdayCake className={styles.icon} /> <p>{profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não informado'}</p></div>
            <div className={`${styles.profileCard} ${styles.addressCard}`}>
              <FaMapMarkerAlt className={styles.icon} />
              <p style={{ whiteSpace: 'pre-line' }}>{fullAddress}</p>
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
