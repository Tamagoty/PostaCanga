// path: src/pages/ObjectsPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './ObjectsPage.module.css';
import { FaBell, FaSearch, FaPlus, FaEdit, FaCheckCircle, FaUndoAlt, FaWhatsapp, FaArchive, FaHistory, FaPaperPlane, FaPhone, FaPhoneSlash, FaBoxOpen, FaCopy, FaBoxes, FaArrowUp, FaArrowDown, FaFilePdf, FaUndo, FaLink, FaFileCsv, FaExclamationTriangle } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ObjectForm from '../components/ObjectForm';
import BulkObjectForm from '../components/BulkObjectForm';
import BulkRegisteredForm from '../components/BulkRegisteredForm';
import BulkNotifyForm from '../components/BulkNotifyForm';
import ProgressBar from '../components/ProgressBar';
import { handleSupabaseError } from '../utils/errorHandler';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useDebounce from '../hooks/useDebounce';
import SuggestionModal from '../components/SuggestionModal';
import Pagination from '../components/Pagination';
import { useObjects } from '../hooks/useObjects';
import MessageComposerModal from '../components/MessageComposerModal';

const replaceVariables = (template, object, appSettings) => {
    if (!template || !object) return template;
    const deadline = new Date(object.storage_deadline);
    deadline.setDate(deadline.getDate() + 1);
    const today = new Date();
    today.setHours(0,0,0,0);
    const prazoFinal = new Date(object.storage_deadline);
    prazoFinal.setHours(0,0,0,0);
    const diffTime = prazoFinal - today;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const variables = {
        '{{NOME_CLIENTE}}': object.recipient_name,
        '{{TIPO_OBJETO}}': object.object_type,
        '{{CODIGO_RASTREIO}}': object.tracking_code || 'N/A',
        '{{NUMERO_CONTROLE}}': object.control_number,
        '{{DIAS_RESTANTES}}': diffDays,
        '{{DATA_PRAZO}}': deadline.toLocaleDateString('pt-BR'),
        '{{NOME_DA_AGENCIA}}': appSettings?.agency_name || 'nossa agência',
        '{{ENDERECO_AGENCIA}}': appSettings?.agency_address || 'nossa agência',
    };
    let populatedTemplate = template;
    for (const variable in variables) {
        populatedTemplate = populatedTemplate.replace(new RegExp(variable, 'g'), variables[variable]);
    }
    return populatedTemplate;
};

const getAddressText = (obj) => {
    if (obj.delivery_street_name) {
        return `${obj.delivery_street_name}, ${obj.delivery_address_number || 'S/N'}`;
    }
    if (obj.customer_address && obj.customer_address.street_name) {
        return `${obj.customer_address.street_name}, ${obj.customer_address.number || 'S/N'}`;
    }
    return 'Não informado';
};

const ObjectsPage = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkSimpleModalOpen, setIsBulkSimpleModalOpen] = useState(false);
  const [isBulkRegisteredModalOpen, setIsBulkRegisteredModalOpen] = useState(false);
  const [isBulkNotifyModalOpen, setIsBulkNotifyModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [bulkReportData, setBulkReportData] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [codesToExport, setCodesToExport] = useState('');
  const [objectToEdit, setObjectToEdit] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState(new Set());
  const [isComposerModalOpen, setIsComposerModalOpen] = useState(false);
  const [notificationContext, setNotificationContext] = useState(null);
  const [objectToSuggestFor, setObjectToSuggestFor] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [appSettings, setAppSettings] = useState(null);
  const [statusFilters, setStatusFilters] = useState(new Set(['Aguardando Retirada']));
  const textareaRef = useRef(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { objects, contactMap, loading, currentPage, setCurrentPage, sortConfig, requestSort, totalPages, refetch } = useObjects({
    debouncedSearchTerm, itemsPerPage, statusFilters
  });

  useEffect(() => {
    const fetchAppSettings = async () => {
        const { data, error } = await supabase.rpc('get_all_app_settings');
        if (error) {
            toast.error("Não foi possível carregar as configurações da agência.");
        } else {
            setAppSettings(data);
        }
    };
    fetchAppSettings();
  }, []);

  const handleFilterToggle = (filter) => {
    setStatusFilters(prevFilters => {
      const newFilters = new Set(prevFilters);

      if (filter === 'Arquivados') {
        return new Set(['Arquivados']);
      }
      
      if (newFilters.has('Arquivados')) {
          return new Set([filter]);
      }

      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      
      if (newFilters.size === 0) {
        return new Set(['Aguardando Retirada']);
      }
      
      return newFilters;
    });
  };

  const generateAndDownloadNotifyHTML = (objectsToNotify, rawMessage = '') => {
    let linksHTML = '';
    objectsToNotify.forEach(object => {
      const phone = object.phone_to_use || contactMap[object.recipient_name];
      if (phone) {
        const message = replaceVariables(rawMessage, object, appSettings);
        const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        linksHTML += `<div id="${object.control_number}" class="container" onclick="ocultarDiv(this)"><a href="${url}" target="_blank"><div class="imagem"><img src="https://i.imgur.com/S5h76II.png" alt="Ícone de mensagem" /><div class="texto">${object.control_number}</div></div></a></div>`;
      }
    });
    if (!linksHTML) {
      toast.error('Nenhum contato válido encontrado para os objetos nos filtros selecionados.');
      return;
    }
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
  };

  const startBulkNotifyByFilterProcess = (filters) => {
    setIsBulkNotifyModalOpen(false);
    startNotificationProcess('bulk_by_filter', filters);
  };

  const handleSaveObject = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('create_or_update_object', {
      p_recipient_name: formData.recipient_name, p_object_type: formData.object_type, p_tracking_code: formData.tracking_code || null,
      p_control_number: objectToEdit ? objectToEdit.control_number : null, p_cep: formData.cep || null,
      p_street_name: formData.street_name || null, p_number: formData.number || null, p_neighborhood: formData.neighborhood || null,
      p_city_name: formData.city || null, p_state_uf: formData.state || null,
    });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success(`Objeto ${objectToEdit ? 'atualizado' : 'criado'}!`); setIsModalOpen(false); refetch(); }
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
      refetch();
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
      refetch();
    }
    setIsSaving(false);
  };

  const handleArchiveAction = async () => {
    const toastId = toast.loading('A arquivar objetos concluídos...');
    const { error } = await supabase.rpc('archive_completed_objects');
    if (error) {
      toast.error(handleSupabaseError(error), { id: toastId });
    } else {
      toast.success('Objetos arquivados!', { id: toastId });
      // [CORREÇÃO] Volta para a visualização padrão para que o utilizador veja o resultado
      setStatusFilters(new Set(['Aguardando Retirada']));
    }
  };
  
  const handleUnarchive = async (controlNumber) => {
    const toastId = toast.loading('A recuperar objeto...');
    const { error } = await supabase.rpc('unarchive_object', { p_control_number: controlNumber });
    if (error) toast.error(handleSupabaseError(error), { id: toastId });
    else { toast.success('Objeto recuperado!', { id: toastId }); refetch(); }
  };

  const updateObjectStatus = async (controlNumber, action) => {
    const rpc_function = action === 'deliver' ? 'deliver_object' : 'return_object';
    const { error } = await supabase.rpc(rpc_function, { p_control_number: controlNumber });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Status atualizado!'); refetch(); }
  };

  const handleRevertStatus = async (controlNumber) => {
    const toastId = toast.loading('A reverter status do objeto...');
    const { error } = await supabase.rpc('revert_object_status', { p_control_number: controlNumber });
    if (error) { toast.error(handleSupabaseError(error), { id: toastId }); }
    else { toast.success('Status revertido para "Aguardando Retirada"!', { id: toastId }); refetch(); }
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
    setIsComposerModalOpen(true);
  };

  const handleSendNotifications = async (composedMessage) => {
    if (!notificationContext) return;
    const { type, object } = notificationContext;

    if (type === 'single') {
        const phone = contactMap[object.recipient_name];
        if (!phone) { toast.error('Nenhum contato válido encontrado.'); return; }
        const message = replaceVariables(composedMessage, object, appSettings);
        const url = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    } else if (type === 'bulk') {
        const objectsToNotify = objects.filter(obj => selectedObjects.has(obj.control_number));
        generateAndDownloadNotifyHTML(objectsToNotify, composedMessage);
    } else if (type === 'bulk_by_filter') {
        const toastId = toast.loading('Buscando objetos e gerando notificações...');
        const { data, error } = await supabase.rpc('get_objects_for_notification_by_filter', {
            p_start_control: object.start_control || null,
            p_end_control: object.end_control || null,
            p_start_date: object.start_date || null,
            p_end_date: object.end_date || null,
        });

        if (error) {
            toast.error(handleSupabaseError(error), { id: toastId });
        } else if (data && data.length > 0) {
            generateAndDownloadNotifyHTML(data, composedMessage);
            toast.success('Arquivo de notificações gerado!', { id: toastId });
        } else {
            toast.success('Nenhum objeto encontrado para os filtros selecionados.', { id: toastId });
        }
    }

    setIsComposerModalOpen(false);
    setNotificationContext(null);
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return null;
    return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
  };

  const generatePDF = () => {
    const toastId = toast.loading('A gerar PDF...');
    try {
      if (!bulkReportData || bulkReportData.length === 0) {
        toast.error('Não há dados para gerar o relatório.', { id: toastId });
        return;
      }

      const doc = new jsPDF();
      doc.text("Relatório de Inserção em Massa", 14, 16);
      
      const tableBody = bulkReportData.map(item => [
        item.name,
        item.code || '-',
        item.number
      ]);

      autoTable(doc, {
        head: [['Destinatário', 'Cód. Rastreio', 'N° Controle']],
        body: tableBody,
        startY: 20,
      });
      doc.save(`relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF gerado com sucesso!', { id: toastId });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error('Ocorreu um erro ao gerar o PDF.', { id: toastId });
    }
  };

  const handleLinkObject = async (customerId) => {
    setIsSaving(true);
    const { error } = await supabase.rpc('link_object_to_customer', {
      p_control_number: objectToSuggestFor.control_number,
      p_customer_id: customerId
    });
    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Objeto associado com sucesso!');
      setObjectToSuggestFor(null);
      refetch();
    }
    setIsSaving(false);
  };

  const handleExportExpiring = async () => {
    const toastId = toast.loading('A gerar CSV...');
    const { data, error } = await supabase.rpc('get_expiring_objects');

    if (error) {
      toast.error(handleSupabaseError(error), { id: toastId });
      return;
    }

    if (!data || data.length === 0) {
      toast.success('Nenhum objeto a vencer nos próximos 3 dias.', { id: toastId });
      return;
    }

    const csvHeader = "Nome,Tipo\n";
    const csvRows = data.map(obj => `"${obj.recipient_name}","${obj.object_type}"`).join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'objetos_vencendo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV com objetos a vencer foi gerado!', { id: toastId });
  };

  return (
    <div className={styles.container}>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={objectToEdit ? 'Editar Objeto' : 'Adicionar Novo Objeto'}><ObjectForm onSave={handleSaveObject} onClose={() => setIsModalOpen(false)} objectToEdit={objectToEdit} loading={isSaving} /></Modal>
      <Modal isOpen={isBulkSimpleModalOpen} onClose={() => setIsBulkSimpleModalOpen(false)} title="Inserir Objetos Simples em Massa"><BulkObjectForm onSave={handleBulkSave} onClose={() => setIsBulkSimpleModalOpen(false)} loading={isSaving} /></Modal>
      <Modal isOpen={isBulkRegisteredModalOpen} onClose={() => setIsBulkRegisteredModalOpen(false)} title="Inserir Objetos Registrados em Massa"><BulkRegisteredForm onSave={handleBulkRegisteredSave} onClose={() => setIsBulkRegisteredModalOpen(false)} loading={isSaving} /></Modal>
      <Modal isOpen={isBulkNotifyModalOpen} onClose={() => setIsBulkNotifyModalOpen(false)} title="Gerar Notificações em Lote"><BulkNotifyForm onSave={startBulkNotifyByFilterProcess} onClose={() => setIsBulkNotifyModalOpen(false)} loading={isSaving} /></Modal>
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Relatório de Inserção"><div className={styles.reportContainer}><table className={styles.reportTable}><thead><tr><th>Destinatário</th><th>Cód. Rastreio</th><th>N° Controle</th></tr></thead><tbody>{bulkReportData.map(item => (<tr key={item.number}><td>{item.name}</td><td>{item.code || '-'}</td><td><strong>{item.number}</strong></td></tr>))}</tbody></table><div className={styles.reportActions}><Button onClick={generatePDF} variant="secondary"><FaFilePdf /> Gerar PDF</Button><Button onClick={() => setIsReportModalOpen(false)}>Fechar</Button></div></div></Modal>
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Exportar Códigos de Rastreamento"><textarea ref={textareaRef} value={codesToExport} readOnly className={styles.exportTextarea} /><div className={styles.exportActions}><Button onClick={copyToClipboard}><FaCopy /> Copiar</Button></div></Modal>
      <Modal isOpen={isComposerModalOpen} onClose={() => setIsComposerModalOpen(false)} title="Compositor de Mensagens">
        <MessageComposerModal onSave={handleSendNotifications} onClose={() => setIsComposerModalOpen(false)} loading={isSaving} />
      </Modal>
      <SuggestionModal isOpen={!!objectToSuggestFor} onClose={() => setObjectToSuggestFor(null)} object={objectToSuggestFor} onLink={handleLinkObject} loading={isSaving} />

      <header className={styles.header}>
        <h1>Gerenciamento de Objetos</h1>
        <div className={styles.actions}>
          <div className={styles.searchInputWrapper}><Input id="search" placeholder="Buscar..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Button onClick={handleExportExpiring} variant="secondary"><FaFileCsv /> Exportar Vencimentos</Button>
          <Button onClick={() => setIsBulkNotifyModalOpen(true)} variant="secondary"><FaBell /> Notificar em Lote</Button>
          {selectedObjects.size > 0 && <Button onClick={() => startNotificationProcess('bulk')} variant="secondary"><FaPaperPlane /> Notificar ({selectedObjects.size})</Button>}
          {selectedObjects.size > 0 && <Button onClick={handleExportTrackingCodes} variant="secondary"><FaCopy /> Exportar Códigos</Button>}
          <Button onClick={() => setIsBulkRegisteredModalOpen(true)} variant="secondary"><FaBoxes /> Inserir Registrados</Button>
          <Button onClick={() => setIsBulkSimpleModalOpen(true)} variant="secondary"><FaBoxes /> Inserir Simples</Button>
          <Button onClick={() => { setObjectToEdit(null); setIsModalOpen(true); }}><FaPlus /> Novo Objeto</Button>
        </div>
      </header>
      
      <div className={styles.filterActions}>
          <div className={styles.filterGroup}>
            <button className={`${styles.filterButton} ${statusFilters.has('Aguardando Retirada') ? styles.active : ''}`} onClick={() => handleFilterToggle('Aguardando Retirada')}>
                <FaBoxOpen /> Aguardando
            </button>
            <button className={`${styles.filterButton} ${statusFilters.has('Vencidos') ? styles.active : ''}`} onClick={() => handleFilterToggle('Vencidos')}>
                <FaExclamationTriangle /> Vencidos
            </button>
            <button className={`${styles.filterButton} ${statusFilters.has('Entregue') ? styles.active : ''}`} onClick={() => handleFilterToggle('Entregue')}>
                <FaCheckCircle /> Entregues
            </button>
            <button className={`${styles.filterButton} ${statusFilters.has('Devolvido') ? styles.active : ''}`} onClick={() => handleFilterToggle('Devolvido')}>
                <FaUndoAlt /> Devolvidos
            </button>
            <button className={`${styles.filterButton} ${statusFilters.has('Arquivados') ? styles.active : ''}`} onClick={() => handleFilterToggle('Arquivados')}>
                <FaArchive /> Arquivados
            </button>
          </div>
          {!statusFilters.has('Arquivados') && (
            <Button onClick={handleArchiveAction} variant="secondary" className={styles.archiveActionButton}>
                <FaArchive /> Arquivar Concluídos
            </Button>
          )}
      </div>

      <div className={styles.tableContainer}>
        {loading ? <TableSkeleton columns={6} rows={itemsPerPage} /> : (
          <table className={styles.table}>
            <thead>
              <tr>
                {!statusFilters.has('Arquivados') && <th className={styles.checkboxCell}><input type="checkbox" onChange={handleSelectAll} checked={selectedObjects.size > 0 && selectedObjects.size === objects.filter(o => o.status === 'Aguardando Retirada').length} /></th>}
                <th onClick={() => requestSort('control_number')} className={styles.sortableHeader}>N° Controle {getSortIcon('control_number')}</th>
                <th onClick={() => requestSort('recipient_name')} className={styles.sortableHeader}>Destinatário {getSortIcon('recipient_name')}</th>
                <th>Endereço</th>
                <th onClick={() => requestSort('storage_deadline')} className={styles.sortableHeader}>Prazo de Guarda {getSortIcon('storage_deadline')}</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {objects.map(obj => {
                  const hasContact = !!contactMap[obj.recipient_name];
                  const addressText = getAddressText(obj);
                  return (
                    <tr key={obj.control_number}>
                      {!statusFilters.has('Arquivados') && <td className={styles.checkboxCell}>{obj.status === 'Aguardando Retirada' && <input type="checkbox" checked={selectedObjects.has(obj.control_number)} onChange={() => handleSelectObject(obj.control_number)} />}</td>}
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
                              {!obj.customer_id && obj.status === 'Aguardando Retirada' && (
                                <button className={`${styles.actionButton} ${styles.link}`} title="Sugerir e Associar Cliente" onClick={() => setObjectToSuggestFor(obj)}>
                                  <FaLink />
                                </button>
                              )}
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
                })}
            </tbody>
          </table>
        )}
      </div>
      
      <Pagination
        currentPage={currentPage - 1}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page + 1)}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default ObjectsPage;
