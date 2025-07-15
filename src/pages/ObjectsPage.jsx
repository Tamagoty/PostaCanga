// Arquivo: src/pages/ObjectsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './ObjectsPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaCheckCircle, FaUndoAlt, FaWhatsapp, FaPaperPlane, FaPhone, FaPhoneSlash } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectForm from '../components/ObjectForm';
import ProgressBar from '../components/ProgressBar';

const ObjectsPage = () => {
  const [objects, setObjects] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [objectToEdit, setObjectToEdit] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState(new Set());

  // --- Funções de busca e manipulação de dados ---
  const fetchObjects = useCallback(async () => {
    let { data, error } = await supabase
      .from('objects')
      .select('*, addresses ( street_name, city, state )')
      .order('arrival_date', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar objetos: ' + error.message);
      setObjects([]);
    } else {
      setObjects(data);
    }
  }, []);

  const fetchAllCustomerData = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, cellphone, contact_customer_id, is_active');
    
    if (error) {
      toast.error('Erro ao carregar dados de contato dos clientes.');
    } else {
      setCustomerData(data);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchObjects(), fetchAllCustomerData()]).finally(() => setLoading(false));
  }, [fetchObjects, fetchAllCustomerData]);


  const handleCloseModal = () => {
    setIsModalOpen(false);
    setObjectToEdit(null);
  };

  const handleSaveObject = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_object', {
      p_recipient_name: formData.recipient_name,
      p_object_type: formData.object_type,
      p_tracking_code: formData.tracking_code || null,
      p_control_number: objectToEdit ? objectToEdit.control_number : null
    });

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } else {
      toast.success(`Objeto ${objectToEdit ? 'atualizado' : 'criado'}!`);
      handleCloseModal();
      fetchObjects();
      fetchAllCustomerData(); // Atualiza os contatos também
    }
    setIsSaving(false);
  };

  const updateObjectStatus = async (controlNumber, action) => {
    const rpc_function = action === 'deliver' ? 'deliver_object' : 'return_object';
    const toast_id = toast.loading(`Marcando como ${action === 'deliver' ? 'entregue' : 'devolvido'}...`);
    
    const { error } = await supabase.rpc(rpc_function, { p_control_number: controlNumber });

    if (error) {
      toast.error(`Erro: ${error.message}`, { id: toast_id });
    } else {
      toast.success('Status atualizado!', { id: toast_id });
      fetchObjects();
    }
  };

  // --- Lógica de Seleção ---
  const handleSelectObject = (controlNumber) => {
    setSelectedObjects(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(controlNumber)) {
        newSelection.delete(controlNumber);
      } else {
        newSelection.add(controlNumber);
      }
      return newSelection;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allAwaitingIds = filteredObjects
        .filter(obj => obj.status === 'Aguardando Retirada')
        .map(obj => obj.control_number);
      setSelectedObjects(new Set(allAwaitingIds));
    } else {
      setSelectedObjects(new Set());
    }
  };

  // --- Lógica de Notificação ---
  const getPhoneNumberForObject = (object, allCustomers) => {
    const mainCustomer = allCustomers.find(c => c.full_name === object.recipient_name && c.is_active);
    if (!mainCustomer) return null;
    if (mainCustomer.cellphone) return mainCustomer.cellphone;
    if (mainCustomer.contact_customer_id) {
      const contactCustomer = allCustomers.find(c => c.id === mainCustomer.contact_customer_id && c.is_active);
      return contactCustomer?.cellphone || null;
    }
    return null;
  };

  const getWhatsAppMessage = (object) => {
    const agencyName = "Correio de América Dourada";
    const introMessage = `📢 *${agencyName}* informa!\n\n`;
    const getObjectEmoji = (type) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('cartão')) return '💳';
        if (lowerType.includes('carta')) return '✉️';
        if (lowerType.includes('revista')) return '📖';
        if (lowerType.includes('telegrama')) return '⚡';
        return '📦';
    };
    const deadline = new Date(object.storage_deadline);
    deadline.setDate(deadline.getDate() + 1);
    const messageBody = 
        `${getObjectEmoji(object.object_type)} *${object.object_type.toUpperCase()}* disponível para retirada em nome de:\n` +
        `👤 *${object.recipient_name.toUpperCase()}*\n` +
        `⏳ Prazo: até *${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}*\n` +
        `🔑 Código para retirada: *${object.control_number}*`;
    const disclaimer = `\n\n_(Se não quiser mais receber informações envie a palavra PARE e todo o seu cadastro será apagado ❌)_`;
    return introMessage + messageBody + disclaimer;
  };

  const handleIndividualNotify = (object) => {
    const phone = getPhoneNumberForObject(object, customerData);
    if (!phone) {
      toast.error('Nenhum contato válido encontrado para este destinatário.');
      return;
    }
    const message = getWhatsAppMessage(object);
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleGenerateBulkNotifyHTML = async () => {
    const toastId = toast.loading('Preparando notificações em massa...');
    const objectsToNotify = objects.filter(obj => selectedObjects.has(obj.control_number));
    
    let linksHTML = '';
    for (const object of objectsToNotify) {
      const phone = getPhoneNumberForObject(object, customerData);
      if (phone) {
        const message = getWhatsAppMessage(object);
        const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        linksHTML += `
          <div id="${object.control_number}" class="container" onclick="ocultarDiv(this)"> 
            <a href="${url}" target="_blank">
              <div class="imagem">
                <img src="https://i.imgur.com/S5h76II.png" alt="Ícone de mensagem" />
                <div class="texto">${object.control_number}</div>
              </div>
            </a>
          </div>`;
      }
    }

    if (!linksHTML) {
      toast.error('Nenhum contato válido encontrado para os objetos selecionados.', { id: toastId });
      return;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Notificações em Massa - ${new Date().toLocaleDateString()}</title>
        <style>
          body { background: linear-gradient(to bottom left, #1a1d24, #272b35); min-height: 100vh; font-family: sans-serif; padding: 20px; margin: 0; }
          .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 20px; }
          .container { cursor: pointer; text-align: center; transition: opacity 0.3s, transform 0.3s; }
          .imagem { position: relative; display: inline-block; }
          img { width: 120px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
          .texto { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 1.5rem; font-weight: bold; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7); }
          a { text-decoration: none; }
          .hidden { opacity: 0.2; transform: scale(0.9); pointer-events: none; }
        </style>
      </head>
      <body>
        <div class="grid-container">${linksHTML}</div>
        <script>
          function ocultarDiv(element) { element.classList.add("hidden"); }
        </script>
      </body>
      </html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
    toast.success('Página de notificações gerada!', { id: toastId });
  };

  // --- Renderização ---
  const filteredObjects = objects.filter(obj => 
    obj.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (obj.tracking_code && obj.tracking_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    obj.control_number.toString().includes(searchTerm)
  );

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={objectToEdit ? 'Editar Objeto' : 'Adicionar Novo Objeto'}>
        <ObjectForm onSave={handleSaveObject} onClose={handleCloseModal} objectToEdit={objectToEdit} loading={isSaving} />
      </Modal>

      <header className={styles.header}>
        <h1>Gerenciamento de Objetos</h1>
        <div className={styles.actions}>
          <Input id="search" placeholder="Buscar por destinatário, rastreio..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {selectedObjects.size > 0 && (
            <Button onClick={handleGenerateBulkNotifyHTML} variant="secondary">
              <FaPaperPlane /> Gerar Notificações ({selectedObjects.size})
            </Button>
          )}
          <Button onClick={() => { setObjectToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Objeto</Button>
        </div>
      </header>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input type="checkbox" onChange={handleSelectAll} checked={selectedObjects.size > 0 && selectedObjects.size === filteredObjects.filter(o => o.status === 'Aguardando Retirada').length} />
              </th>
              <th>N° Controle</th>
              <th>Destinatário</th>
              <th>Endereço</th>
              <th>Prazo de Guarda</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6">Carregando...</td></tr>
            ) : filteredObjects.length > 0 ? (
              filteredObjects.map(obj => {
                const hasContact = !!getPhoneNumberForObject(obj, customerData);
                return (
                  <tr key={obj.control_number} className={selectedObjects.has(obj.control_number) ? styles.selectedRow : ''}>
                    <td className={styles.checkboxCell}>
                      {obj.status === 'Aguardando Retirada' && (
                        <input type="checkbox" checked={selectedObjects.has(obj.control_number)} onChange={() => handleSelectObject(obj.control_number)} />
                      )}
                    </td>
                    <td data-label="N° Controle">{obj.control_number}</td>
                    <td data-label="Destinatário">
                      <div className={styles.recipientInfo}>
                        <span className={styles.recipientName}>
                          {hasContact 
                            ? <FaPhone className={styles.contactIcon} /> 
                            : <FaPhoneSlash className={`${styles.contactIcon} ${styles.noContact}`} />
                          }
                          {obj.recipient_name}
                        </span>
                        <span className={styles.recipientSub}>{obj.tracking_code || obj.object_type}</span>
                      </div>
                    </td>
                    <td data-label="Endereço">{obj.addresses ? `${obj.addresses.street_name}, ${obj.addresses.city}` : 'Não informado'}</td>
                    <td data-label="Prazo de Guarda"><ProgressBar startDate={obj.arrival_date} endDate={obj.storage_deadline} status={obj.status} /></td>
                    <td data-label="Ações">
                      <div className={styles.actionButtons}>
                        {hasContact && obj.status === 'Aguardando Retirada' && (
                          <button className={`${styles.actionButton} ${styles.whatsapp}`} title="Notificar via WhatsApp" onClick={() => handleIndividualNotify(obj)}>
                            <FaWhatsapp />
                          </button>
                        )}
                        <button className={styles.actionButton} title="Editar" onClick={() => { setObjectToEdit(obj); setIsModalOpen(true); }}>
                          <FaEdit />
                        </button>
                        {obj.status === 'Aguardando Retirada' && (
                          <>
                            <button className={`${styles.actionButton} ${styles.deliver}`} title="Entregar" onClick={() => updateObjectStatus(obj.control_number, 'deliver')}><FaCheckCircle /></button>
                            <button className={`${styles.actionButton} ${styles.return}`} title="Devolver" onClick={() => updateObjectStatus(obj.control_number, 'return')}><FaUndoAlt /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr><td colSpan="6">Nenhum objeto encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObjectsPage;
