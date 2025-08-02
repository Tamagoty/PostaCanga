// path: src/pages/ObjectsPage.jsx
// FUNCIONALIDADE (v1.6): Implementada a substituição de variáveis dinâmicas
// nos modelos de mensagem antes de enviar as notificações.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './ObjectsPage.module.css';
import { FaSearch, FaPlus, FaEdit, FaCheckCircle, FaUndoAlt, FaWhatsapp, FaArchive, FaHistory, FaPaperPlane, FaPhone, FaPhoneSlash, FaBoxOpen, FaCopy, FaBoxes, FaArrowUp, FaArrowDown, FaFilePdf, FaUndo } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectForm from '../components/ObjectForm';
import BulkObjectForm from '../components/BulkObjectForm';
import BulkRegisteredForm from '../components/BulkRegisteredForm';
import ProgressBar from '../components/ProgressBar';
import { handleSupabaseError } from '../utils/errorHandler';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { ITEMS_PER_PAGE } from '../constants';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import useDebounce from '../hooks/useDebounce';
import PromptModal from '../components/PromptModal';

// Função para substituir as variáveis dinâmicas num modelo de texto
const replaceVariables = (template, object) => {
    if (!template || !object) return template;
    
    const deadline = new Date(object.storage_deadline);
    deadline.setDate(deadline.getDate() + 1);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const prazoFinal = new Date(object.storage_deadline);
    prazoFinal.setHours(0,0,0,0);
    
    const diffTime = prazoFinal - today;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return template
        .replace(/{{NOME_CLIENTE}}/g, object.recipient_name)
        .replace(/{{DIAS_RESTANTES}}/g, diffDays)
        .replace(/{{DATA_PRAZO}}/g, deadline.toLocaleDateString('pt-BR'))
        .replace(/{{TIPO_OBJETO}}/g, object.object_type)
        .replace(/{{CODIGO_RASTREIO}}/g, object.tracking_code || 'N/A');
};

const getWhatsAppMessage = (object, extraMessage = '') => {
  const agencyName = import.meta.env.VITE_AGENCY_NAME || "Agência dos Correios";
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
  
  const extraContent = extraMessage.trim() ? `\n\n----------\n\n${extraMessage.trim()}` : '';
  const disclaimer = `\n\n_(Se não quiser mais receber informações envie a palavra PARE e todo o seu cadastro será apagado ❌)_`;
  
  return introMessage + messageBody + extraContent + disclaimer;
};

const ObjectsPage = () => {
  const [objects, setObjects] = useState([]);
  const [contactMap, setContactMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkSimpleModalOpen, setIsBulkSimpleModalOpen] = useState(false);
  const [isBulkRegisteredModalOpen, setIsBulkRegisteredModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [bulkReportData, setBulkReportData] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [codesToExport, setCodesToExport] = useState('');
  const [objectToEdit, setObjectToEdit] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'arrival_date', direction: 'desc' });
  const textareaRef = useRef(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notificationContext, setNotificationContext] = useState(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      let objectQuery = supabase.from('objects').select('*, addresses:delivery_address_id(*, city:cities(name, state:states(uf)))');
      objectQuery = showArchived ? objectQuery.eq('is_archived', true) : objectQuery.eq('is_archived', false);
      if (debouncedSearchTerm) {
        const isNumeric = /^\d+$/.test(debouncedSearchTerm);
        let orConditions = [`recipient_name.ilike.%${debouncedSearchTerm}%`, `tracking_code.ilike.%${debouncedSearchTerm}%`];
        if (isNumeric) { orConditions.push(`control_number.eq.${debouncedSearchTerm}`); }
        objectQuery = objectQuery.or(orConditions.join(','));
      }
      const { data: objectsData, error: objectsError } = await objectQuery.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      if (objectsError) throw objectsError;
      const currentObjects = objectsData || [];
      setObjects(currentObjects);
      if (currentObjects.length > 0) {
        const recipientNames = [...new Set(currentObjects.map(obj => obj.recipient_name))];
        const { data: phoneData, error: phoneError } = await supabase.rpc('get_phones_for_recipients', { p_recipient_names: recipientNames });
        if (phoneError) throw phoneError;
        setContactMap(phoneData || {});
      } else {
        setContactMap({});
      }
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  }, [showArchived, sortConfig, debouncedSearchTerm]);

  useEffect(() => { loadInitialData(); setSelectedObjects(new Set()); }, [loadInitialData]);

  const handleSaveObject = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_object', {
      p_recipient_name: formData.recipient_name, p_object_type: formData.object_type, p_tracking_code: formData.tracking_code || null,
      p_control_number: objectToEdit ? objectToEdit.control_number : null, p_cep: formData.cep || null,
      p_street_name: formData.street_name || null, p_number: formData.number || null, p_neighborhood: formData.neighborhood || null,
      p_city_name: formData.city || null, p_state_uf: formData.state || null,
    });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success(`Objeto ${objectToEdit ? 'atualizado' : 'criado'}!`); setIsModalOpen(false); loadInitialData(); }
    setIsSaving(false);
  };

  const handleBulkSave = async ({ objects, type }) => {
    setIsSaving(true);
    const { data: report, error } = await supabase.rpc('bulk_create_simple_objects', { p_object_type: type, p_objects: objects });
    if (error) { toast.error(handleSupabaseError(error)); }
    else {
      const reportData = report.map(r => ({ name: r.report_recipient_name, number: r.report_control_number }));
      toast.success(`${report.length} objetos foram criados com sucesso!`);
      setBulkReportData(reportData);
      await supabase.rpc('save_bulk_report', { p_report_data: reportData });
      setIsReportModalOpen(true);
      setIsBulkSimpleModalOpen(false);
      loadInitialData();
    }
    setIsSaving(false);
  };

  const handleBulkRegisteredSave = async ({ objects }) => {
    setIsSaving(true);
    const { data: report, error } = await supabase.rpc('bulk_create_registered_objects', { p_objects: objects });
    if (error) { toast.error(handleSupabaseError(error)); }
    else {
      const reportData = report.map(r => ({ name: r.report_recipient_name, number: r.report_control_number, code: r.report_tracking_code }));
      toast.success(`${report.length} objetos registrados foram criados!`);
      setBulkReportData(reportData);
      await supabase.rpc('save_bulk_report', { p_report_data: reportData });
      setIsReportModalOpen(true);
      setIsBulkRegisteredModalOpen(false);
      loadInitialData();
    }
    setIsSaving(false);
  };

  const handleArchiveAction = async () => {
    const toastId = toast.loading('Arquivando objetos concluídos...');
    const { error } = await supabase.rpc('archive_completed_objects');
    if (error) toast.error(handleSupabaseError(error), { id: toastId });
    else { toast.success('Objetos arquivados!', { id: toastId }); loadInitialData(); }
  };
  
  const handleUnarchive = async (controlNumber) => {
    const toastId = toast.loading('Recuperando objeto...');
    const { error } = await supabase.rpc('unarchive_object', { p_control_number: controlNumber });
    if (error) toast.error(handleSupabaseError(error), { id: toastId });
    else { toast.success('Objeto recuperado!', { id: toastId }); loadInitialData(); }
  };

  const updateObjectStatus = async (controlNumber, action) => {
    const rpc_function = action === 'deliver' ? 'deliver_object' : 'return_object';
    const { error } = await supabase.rpc(rpc_function, { p_control_number: controlNumber });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Status atualizado!'); loadInitialData(); }
  };

  const handleRevertStatus = async (controlNumber) => {
    const toastId = toast.loading('Revertendo status do objeto...');
    const { error } = await supabase.rpc('revert_object_status', { p_control_number: controlNumber });
    if (error) { toast.error(handleSupabaseError(error), { id: toastId }); }
    else { toast.success('Status revertido para "Aguardando Retirada"!', { id: toastId }); loadInitialData(); }
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
      const allAwaitingIds = objects.filter(obj => obj.status === 'Aguardando Retirada').map(obj => obj.control_number);
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

  const startNotificationProcess = (type, object = null) => {
    setNotificationContext({ type, object });
    setIsNotifyModalOpen(true);
  };

  const handleSendNotifications = (rawMessageFromModal) => {
    if (!notificationContext) return;

    if (notificationContext.type === 'single') {
      const object = notificationContext.object;
      const personalizedExtraMessage = replaceVariables(rawMessageFromModal, object);
      const phone = contactMap[object.recipient_name];
      if (!phone) { toast.error('Nenhum contato válido encontrado.'); return; }
      const message = getWhatsAppMessage(object, personalizedExtraMessage);
      const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else if (notificationContext.type === 'bulk') {
      const objectsToNotify = objects.filter(obj => selectedObjects.has(obj.control_number));
      let linksHTML = '';
      objectsToNotify.forEach(object => {
        const phone = contactMap[object.recipient_name];
        if (phone) {
          const personalizedExtraMessage = replaceVariables(rawMessageFromModal, object);
          const message = getWhatsAppMessage(object, personalizedExtraMessage);
          const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
          linksHTML += `<div id="${object.control_number}" class="container" onclick="ocultarDiv(this)"><a href="${url}" target="_blank"><div class="imagem"><img src="https://i.imgur.com/S5h76II.png" alt="Ícone de mensagem" /><div class="texto">${object.control_number}</div></div></a></div>`;
        }
      });
      if (!linksHTML) { toast.error('Nenhum contato válido encontrado para os objetos selecionados.'); return; }
      
      const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Notificações WhatsApp</title><style>body{background:linear-gradient(to bottom left,#1a1d24,#272b35);min-height:100vh;font-family:sans-serif;padding:20px;margin:0}.grid-container{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:20px}.container{cursor:pointer;text-align:center;transition:opacity .3s,transform .3s}.imagem{position:relative;display:inline-block}img{width:120px;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,.4)}.texto{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.5rem;font-weight:700;text-shadow:2px 2px 4px rgba(0,0,0,.7)}a{text-decoration:none}.hidden{opacity:.2;transform:scale(.9);pointer-events:none}</style></head><body><div class="grid-container">${linksHTML}</div><script>function ocultarDiv(e){e.classList.add("hidden")}</script></body></html>`;
      
      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'notificacoes_whatsapp.html');
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Arquivo de notificações gerado!');
    }

    setIsNotifyModalOpen(false);
    setNotificationContext(null);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return null;
    return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Inserção em Massa", 14, 16);
    doc.autoTable({
      head: [['Destinatário', 'Cód. Rastreio', 'N° Controle']],
      body: bulkReportData.map(item => [item.name, item.code || '-', item.number]),
      startY: 20,
    });
    doc.save(`relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredObjects = objects;

  return (
    <div className={styles.container}>
      {/* Modais existentes... */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={objectToEdit ? 'Editar Objeto' : 'Adicionar Novo Objeto'}><ObjectForm onSave={handleSaveObject} onClose={() => setIsModalOpen(false)} objectToEdit={objectToEdit} loading={isSaving} /></Modal>
      <Modal isOpen={isBulkSimpleModalOpen} onClose={() => setIsBulkSimpleModalOpen(false)} title="Inserir Objetos Simples em Massa"><BulkObjectForm onSave={handleBulkSave} onClose={() => setIsBulkSimpleModalOpen(false)} loading={isSaving} /></Modal>
      <Modal isOpen={isBulkRegisteredModalOpen} onClose={() => setIsBulkRegisteredModalOpen(false)} title="Inserir Objetos Registrados em Massa"><BulkRegisteredForm onSave={handleBulkRegisteredSave} onClose={() => setIsBulkRegisteredModalOpen(false)} loading={isSaving} /></Modal>
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Relatório de Inserção"><div className={styles.reportContainer}><table className={styles.reportTable}><thead><tr><th>Destinatário</th><th>Cód. Rastreio</th><th>N° Controle</th></tr></thead><tbody>{bulkReportData.map(item => (<tr key={item.number}><td>{item.name}</td><td>{item.code || '-'}</td><td><strong>{item.number}</strong></td></tr>))}</tbody></table><div className={styles.reportActions}><Button onClick={generatePDF} variant="secondary"><FaFilePdf /> Gerar PDF</Button><Button onClick={() => setIsReportModalOpen(false)}>Fechar</Button></div></div></Modal>
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Exportar Códigos de Rastreamento"><textarea ref={textareaRef} value={codesToExport} readOnly className={styles.exportTextarea} /><div className={styles.exportActions}><Button onClick={copyToClipboard}><FaCopy /> Copiar</Button></div></Modal>
      
      <PromptModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        onSave={handleSendNotifications}
        title="Adicionar Mensagem Extra"
        label="Selecione um modelo ou digite uma mensagem"
        placeholder="Ex: Aproveite a nossa promoção!"
        confirmText="Enviar Notificações"
        isTextarea={true}
      />

      <header className={styles.header}>
        <h1>{showArchived ? "Objetos Arquivados" : "Gerenciamento de Objetos"}</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}><Input id="search" placeholder="Buscar..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          {selectedObjects.size > 0 && <Button onClick={() => startNotificationProcess('bulk')} variant="secondary"><FaPaperPlane /> Notificar ({selectedObjects.size})</Button>}
          {selectedObjects.size > 0 && <Button onClick={handleExportTrackingCodes} variant="secondary"><FaCopy /> Exportar Códigos</Button>}
          <Button onClick={() => setShowArchived(!showArchived)} variant="secondary">{showArchived ? <FaBoxOpen /> : <FaArchive />} {showArchived ? "Ver Ativos" : "Ver Arquivados"}</Button>
          {!showArchived && <Button onClick={handleArchiveAction}><FaArchive /> Arquivar Concluídos</Button>}
          <Button onClick={() => setIsBulkRegisteredModalOpen(true)} variant="secondary"><FaBoxes /> Inserir Registrados</Button>
          <Button onClick={() => setIsBulkSimpleModalOpen(true)} variant="secondary"><FaBoxes /> Inserir Simples</Button>
          <Button onClick={() => { setObjectToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Objeto</Button>
        </div>
      </header>
      
      <div className={styles.tableContainer}>
        {loading ? (
          <TableSkeleton columns={showArchived ? 5 : 6} rows={ITEMS_PER_PAGE} />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {!showArchived && <th className={styles.checkboxCell}><input type="checkbox" onChange={handleSelectAll} /></th>}
                <th onClick={() => requestSort('control_number')} className={styles.sortableHeader}>N° Controle {getSortIcon('control_number')}</th>
                <th onClick={() => requestSort('recipient_name')} className={styles.sortableHeader}>Destinatário {getSortIcon('recipient_name')}</th>
                <th>Endereço</th>
                <th>Prazo de Guarda</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredObjects.length > 0 ? (
                filteredObjects.map(obj => {
                  const hasContact = !!contactMap[obj.recipient_name];
                  const addressText = obj.delivery_street_name 
                    ? obj.delivery_street_name 
                    : (obj.addresses ? obj.addresses.street_name : 'Não informado');
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
                              {hasContact && obj.status === 'Aguardando Retirada' && (<button className={`${styles.actionButton} ${styles.whatsapp}`} title="Notificar via WhatsApp" onClick={() => startNotificationProcess('single', obj)}><FaWhatsapp /></button>)}
                              <button className={styles.actionButton} title="Editar" onClick={() => { setObjectToEdit(obj); setIsModalOpen(true); }}><FaEdit /></button>
                              {obj.status === 'Aguardando Retirada' && (<><button className={`${styles.actionButton} ${styles.deliver}`} title="Entregar" onClick={() => updateObjectStatus(obj.control_number, 'deliver')}><FaCheckCircle /></button><button className={`${styles.actionButton} ${styles.return}`} title="Devolver" onClick={() => updateObjectStatus(obj.control_number, 'return')}><FaUndoAlt /></button></>)}
                              {(obj.status === 'Entregue' || obj.status === 'Devolvido') && (<button className={styles.actionButton} title="Reverter Status" onClick={() => handleRevertStatus(obj.control_number)}><FaUndo /></button>)}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={showArchived ? 5 : 6}>
                    <EmptyState 
                      icon={FaBoxOpen}
                      title={searchTerm ? "Nenhum resultado" : "Nenhum objeto"}
                      message={searchTerm ? <>Nenhum objeto encontrado para a busca <strong>"{searchTerm}"</strong>.</> : "Ainda não há objetos nesta seção."}
                    />
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

export default ObjectsPage;
