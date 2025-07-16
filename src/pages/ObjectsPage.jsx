// Arquivo: src/pages/ObjectsPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './ObjectsPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaCheckCircle, FaUndoAlt, FaWhatsapp, FaArchive, FaHistory, FaPaperPlane, FaPhone, FaPhoneSlash, FaBoxOpen, FaCopy } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectForm from '../components/ObjectForm';
import ProgressBar from '../components/ProgressBar';

// --- Funções Auxiliares ---
const getWhatsAppMessage = (object) => {
  const agencyName = "Correio de América Dourada";
  const introMessage = `📢 *${agencyName}* informa!\n\n`;
  const getObjectEmoji = (type) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('cartão')) return '💳'; if (lowerType.includes('carta')) return '✉️';
    if (lowerType.includes('revista')) return '📖'; if (lowerType.includes('telegrama')) return '⚡';
    return '📦';
  };
  const deadline = new Date(object.storage_deadline); deadline.setDate(deadline.getDate() + 1);
  const messageBody = `${getObjectEmoji(object.object_type)} *${object.object_type.toUpperCase()}* disponível para retirada em nome de:\n` +
    `👤 *${object.recipient_name.toUpperCase()}*\n` + `⏳ Prazo: até *${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}*\n` +
    `🔑 Código para retirada: *${object.control_number}*`;
  const disclaimer = `\n\n_(Se não quiser mais receber informações envie a palavra PARE e todo o seu cadastro será apagado ❌)_`;
  return introMessage + messageBody + disclaimer;
};

// --- Componente Principal ---
const ObjectsPage = () => {
  const [objects, setObjects] = useState([]);
  const [contactMap, setContactMap] = useState({}); // Mapeia nome do destinatário para o telefone
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [codesToExport, setCodesToExport] = useState('');
  const [objectToEdit, setObjectToEdit] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState(new Set());
  const textareaRef = useRef(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Etapa 1: Buscar a lista de objetos
      let objectQuery = supabase.from('objects').select('*, addresses:delivery_address_id(*, city:cities(name, state:states(uf)))');
      objectQuery = showArchived ? objectQuery.eq('is_archived', true) : objectQuery.eq('is_archived', false);
      const { data: objectsData, error: objectsError } = await objectQuery.order('arrival_date', { ascending: false });
      if (objectsError) throw objectsError;
      setObjects(objectsData || []);

      // Etapa 2: Se houver objetos, buscar os telefones para os destinatários
      if (objectsData && objectsData.length > 0) {
        const recipientNames = [...new Set(objectsData.map(obj => obj.recipient_name))];
        const { data: phoneData, error: phoneError } = await supabase.rpc('get_phones_for_recipients', { p_recipient_names: recipientNames });
        if (phoneError) throw phoneError;
        setContactMap(phoneData || {});
      } else {
        setContactMap({});
      }
    } catch (error) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { loadInitialData(); setSelectedObjects(new Set()); }, [loadInitialData]);

  const handleSaveObject = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_object', {
      p_recipient_name: formData.recipient_name, p_object_type: formData.object_type, p_tracking_code: formData.tracking_code || null,
      p_control_number: objectToEdit ? objectToEdit.control_number : null, p_cep: formData.cep || null,
      p_street_name: formData.street_name || null, p_number: formData.number || null, p_neighborhood: formData.neighborhood || null,
      p_city_name: formData.city || null, p_state_uf: formData.state || null,
    });
    if (error) toast.error(`Erro ao salvar: ${error.message}`);
    else { toast.success(`Objeto ${objectToEdit ? 'atualizado' : 'criado'}!`); setIsModalOpen(false); loadInitialData(); }
    setIsSaving(false);
  };

  const handleArchiveAction = async () => {
    const toastId = toast.loading('Arquivando objetos concluídos...');
    const { error } = await supabase.rpc('archive_completed_objects');
    if (error) toast.error(`Erro: ${error.message}`, { id: toastId });
    else { toast.success('Objetos arquivados!', { id: toastId }); loadInitialData(); }
  };
  
  const handleUnarchive = async (controlNumber) => {
    const toastId = toast.loading('Recuperando objeto...');
    const { error } = await supabase.rpc('unarchive_object', { p_control_number: controlNumber });
    if (error) toast.error(`Erro: ${error.message}`, { id: toastId });
    else { toast.success('Objeto recuperado!', { id: toastId }); loadInitialData(); }
  };

  const updateObjectStatus = async (controlNumber, action) => {
    const rpc_function = action === 'deliver' ? 'deliver_object' : 'return_object';
    const { error } = await supabase.rpc(rpc_function, { p_control_number: controlNumber });
    if (error) toast.error(`Erro: ${error.message}`);
    else { toast.success('Status atualizado!'); loadInitialData(); }
  };

  const handleSelectObject = (controlNumber) => {
    setSelectedObjects(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(controlNumber)) newSelection.delete(controlNumber);
      else newSelection.add(controlNumber);
      return newSelection;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allAwaitingIds = filteredObjects.filter(obj => obj.status === 'Aguardando Retirada').map(obj => obj.control_number);
      setSelectedObjects(new Set(allAwaitingIds));
    } else {
      setSelectedObjects(new Set());
    }
  };

  const handleExportTrackingCodes = () => {
    const codes = objects.filter(o => selectedObjects.has(o.control_number) && o.tracking_code).map(o => o.tracking_code).join(';\n');
    if (!codes) { toast.error('Nenhum objeto selecionado tem código de rastreamento.'); return; }
    setCodesToExport(codes);
    setIsExportModalOpen(true);
  };

  const copyToClipboard = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      document.execCommand('copy');
      toast.success('Códigos copiados para a área de transferência!');
    }
  };

  const handleIndividualNotify = (object) => {
    const phone = contactMap[object.recipient_name];
    if (!phone) { toast.error('Nenhum contato válido encontrado.'); return; }
    const message = getWhatsAppMessage(object);
    const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleGenerateBulkNotifyHTML = () => {
    const objectsToNotify = objects.filter(obj => selectedObjects.has(obj.control_number));
    let linksHTML = '';
    objectsToNotify.forEach(object => {
      const phone = contactMap[object.recipient_name];
      if (phone) {
        const message = getWhatsAppMessage(object);
        const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        linksHTML += `<div id="${object.control_number}" class="container" onclick="ocultarDiv(this)"><a href="${url}" target="_blank"><div class="imagem"><img src="https://i.imgur.com/S5h76II.png" alt="Ícone de mensagem" /><div class="texto">${object.control_number}</div></div></a></div>`;
      }
    });
    if (!linksHTML) { toast.error('Nenhum contato válido encontrado.'); return; }
    const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Notificações</title><style>body{background:linear-gradient(to bottom left,#1a1d24,#272b35);min-height:100vh;font-family:sans-serif;padding:20px;margin:0}.grid-container{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:20px}.container{cursor:pointer;text-align:center;transition:opacity .3s,transform .3s}.imagem{position:relative;display:inline-block}img{width:120px;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,.4)}.texto{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.5rem;font-weight:700;text-shadow:2px 2px 4px rgba(0,0,0,.7)}a{text-decoration:none}.hidden{opacity:.2;transform:scale(.9);pointer-events:none}</style></head><body><div class="grid-container">${linksHTML}</div><script>function ocultarDiv(e){e.classList.add("hidden")}</script></body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  };

  const filteredObjects = objects.filter(obj => 
    obj.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (obj.tracking_code && obj.tracking_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    obj.control_number.toString().includes(searchTerm)
  );

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={objectToEdit ? 'Editar Objeto' : 'Adicionar Novo Objeto'}>
        <ObjectForm onSave={handleSaveObject} onClose={() => setIsModalOpen(false)} objectToEdit={objectToEdit} loading={isSaving} />
      </Modal>

      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Exportar Códigos de Rastreamento">
        <textarea ref={textareaRef} value={codesToExport} readOnly className={styles.exportTextarea} />
        <div className={styles.exportActions}><Button onClick={copyToClipboard}><FaCopy /> Copiar</Button></div>
      </Modal>

      <header className={styles.header}>
        <h1>{showArchived ? "Objetos Arquivados" : "Gerenciamento de Objetos"}</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}><Input id="search" placeholder="Buscar..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          {selectedObjects.size > 0 && <Button onClick={handleExportTrackingCodes} variant="secondary"><FaCopy /> Exportar Códigos</Button>}
          <Button onClick={() => setShowArchived(!showArchived)} variant="secondary">{showArchived ? <FaBoxOpen /> : <FaArchive />} {showArchived ? "Ver Ativos" : "Ver Arquivados"}</Button>
          {!showArchived && <Button onClick={handleArchiveAction}><FaArchive /> Arquivar Concluídos</Button>}
          <Button onClick={() => { setObjectToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Objeto</Button>
        </div>
      </header>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {!showArchived && <th className={styles.checkboxCell}><input type="checkbox" onChange={handleSelectAll} /></th>}
              <th>N° Controle</th><th>Destinatário</th><th>Endereço</th><th>Prazo de Guarda</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td colSpan={showArchived ? 5 : 6}>A carregar...</td></tr>) 
            : filteredObjects.length > 0 ? (
              filteredObjects.map(obj => {
                const hasContact = !!contactMap[obj.recipient_name];
                const addressText = obj.addresses ? `${obj.addresses.street_name}, ${obj.addresses.city.name}` : 'Não informado';
                return (
                  <tr key={obj.control_number} className={selectedObjects.has(obj.control_number) ? styles.selectedRow : ''}>
                    {!showArchived && <td className={styles.checkboxCell}>{obj.status === 'Aguardando Retirada' && <input type="checkbox" checked={selectedObjects.has(obj.control_number)} onChange={() => handleSelectObject(obj.control_number)} />}</td>}
                    <td data-label="N° Controle">{obj.control_number}</td>
                    <td data-label="Destinatário">
                      <div className={styles.recipientInfo}>
                        <span className={styles.recipientName}>{hasContact ? <FaPhone className={styles.contactIcon} /> : <FaPhoneSlash className={`${styles.contactIcon} ${styles.noContact}`} />}{obj.recipient_name}</span>
                        <span className={styles.recipientSub}>{obj.tracking_code || obj.object_type}</span>
                      </div>
                    </td>
                    <td data-label="Endereço">{addressText}</td>
                    <td data-label="Prazo de Guarda"><ProgressBar startDate={obj.arrival_date} endDate={obj.storage_deadline} status={obj.status} /></td>
                    <td data-label="Ações">
                      <div className={styles.actionButtons}>
                        {obj.is_archived ? (<button className={styles.actionButton} title="Recuperar Objeto" onClick={() => handleUnarchive(obj.control_number)}><FaHistory /></button>) : (
                          <>
                            {hasContact && obj.status === 'Aguardando Retirada' && (<button className={`${styles.actionButton} ${styles.whatsapp}`} title="Notificar via WhatsApp" onClick={() => handleIndividualNotify(obj)}><FaWhatsapp /></button>)}
                            <button className={styles.actionButton} title="Editar" onClick={() => { setObjectToEdit(obj); setIsModalOpen(true); }}><FaEdit /></button>
                            {obj.status === 'Aguardando Retirada' && (<><button className={`${styles.actionButton} ${styles.deliver}`} title="Entregar" onClick={() => updateObjectStatus(obj.control_number, 'deliver')}><FaCheckCircle /></button><button className={`${styles.actionButton} ${styles.return}`} title="Devolver" onClick={() => updateObjectStatus(obj.control_number, 'return')}><FaUndoAlt /></button></>)}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (<tr><td colSpan={showArchived ? 5 : 6}>Nenhum objeto encontrado.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObjectsPage;
