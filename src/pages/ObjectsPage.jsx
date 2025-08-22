// path: src/pages/ObjectsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useDebounce from '../hooks/useDebounce';
import styles from './ObjectsPage.module.css';
import toast from 'react-hot-toast';

// Hooks
import { useObjects } from '../hooks/useObjects';
import { useObjectActions } from '../hooks/useObjectActions';

// Components
import Modal from '../components/Modal';
import ObjectForm from '../components/ObjectForm';
import BulkObjectForm from '../components/BulkObjectForm';
import BulkRegisteredForm from '../components/BulkRegisteredForm';
import BulkNotifyForm from '../components/BulkNotifyForm';
import MessageComposerModal from '../components/MessageComposerModal';
import SuggestionModal from '../components/SuggestionModal';
import Pagination from '../components/Pagination';
import ObjectsHeader from '../components/ObjectsHeader';
import ObjectsFilterBar from '../components/ObjectsFilterBar';
import ObjectsTable from '../components/ObjectsTable';
import BulkImportReport from '../components/BulkImportReport';
import FastLinkerModal from '../components/FastLinkerModal';
import { handleSupabaseError } from '../utils/errorHandler';

const ObjectsPage = () => {
    // State Management
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedObjects, setSelectedObjects] = useState(new Set());
    const [statusFilters, setStatusFilters] = useState(new Set(['Aguardando Retirada']));
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [objectToEdit, setObjectToEdit] = useState(null);
    const [statusCounts, setStatusCounts] = useState({});
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkSimpleModalOpen, setIsBulkSimpleModalOpen] = useState(false);
    const [isBulkRegisteredModalOpen, setIsBulkRegisteredModalOpen] = useState(false);
    const [isBulkNotifyModalOpen, setIsBulkNotifyModalOpen] = useState(false);
    const [isComposerModalOpen, setIsComposerModalOpen] = useState(false);
    const [objectToSuggestFor, setObjectToSuggestFor] = useState(null);
    const [objectsToNotify, setObjectsToNotify] = useState([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState(null);
    
    // Fast Linker States
    const [isLinkerModalOpen, setIsLinkerModalOpen] = useState(false);
    const [objectsToLink, setObjectsToLink] = useState([]);
    const [currentLinkerIndex, setCurrentLinkerIndex] = useState(0);
    const [isLinkerLoading, setIsLinkerLoading] = useState(false);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const { objects, contactMap, loading, currentPage, setCurrentPage, sortConfig, requestSort, totalPages, refetch } = useObjects({
        debouncedSearchTerm, itemsPerPage, statusFilters
    });
    
    const { 
        handleSaveObject, updateObjectStatus, handleBulkUpdateStatus, 
        handleRevertStatus, handleArchiveAction, handleUnarchive 
    } = useObjectActions(refetch, setSelectedObjects);

    useEffect(() => {
        const fetchStatusCounts = async () => {
            const { data, error } = await supabase.rpc('get_object_status_counts');
            if (error) console.error("Erro ao buscar contagem de status:", error.message);
            else if (data) {
                const countsMap = data.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {});
                setStatusCounts(countsMap);
            }
        };
        fetchStatusCounts();
    }, [refetch]);

    // Handlers
    const onSave = async (formData) => {
        setIsSaving(true);
        const success = await handleSaveObject(formData, objectToEdit);
        if (success) setIsModalOpen(false);
        setIsSaving(false);
    };

    const handleSaveBulkSimple = async ({ objects, type }) => {
        setIsSaving(true);
        const { data, error } = await supabase.rpc('bulk_create_simple_objects', {
            p_object_type: type,
            p_objects: objects
        });
        if (error) {
            toast.error(handleSupabaseError(error));
        } else {
            toast.success(`${objects.length} objetos simples inseridos!`);
            setReportData({ type: 'simple', objects: data, objectType: type });
            setIsBulkSimpleModalOpen(false);
            setIsReportModalOpen(true);
            refetch();
        }
        setIsSaving(false);
    };

    const handleSaveBulkRegistered = async ({ objects }) => {
        setIsSaving(true);
        const { data, error } = await supabase.rpc('bulk_create_registered_objects', {
            p_objects: objects
        });
        if (error) {
            toast.error(handleSupabaseError(error));
        } else {
            toast.success(`${objects.length} objetos registrados inseridos!`);
            setReportData({ type: 'registered', objects: data });
            setIsBulkRegisteredModalOpen(false);
            setIsReportModalOpen(true);
            refetch();
        }
        setIsSaving(false);
    };

    const handleGenerateNotifications = async (filters) => {
        setIsSaving(true);
        const { data, error } = await supabase.rpc('get_objects_for_notification_by_filter', {
            p_start_control: filters.start_control || null,
            p_end_control: filters.end_control || null,
            p_start_date: filters.start_date || null,
            p_end_date: filters.end_date || null,
        });

        if (error) {
            toast.error(handleSupabaseError(error));
        } else if (data && data.length > 0) {
            setObjectsToNotify(data);
            setIsBulkNotifyModalOpen(false);
            setIsComposerModalOpen(true);
        } else {
            toast.error('Nenhum objeto encontrado para os filtros selecionados.');
        }
        setIsSaving(false);
    };
    
    // CORREÇÃO: Função reescrita para gerar e baixar um arquivo HTML.
    const handleSendNotifications = async (composedMessage) => {
        if (!composedMessage.trim()) {
            toast.error("A mensagem não pode estar vazia.");
            return;
        }
        setIsSending(true);
        try {
            const { data: messagesData, error } = await supabase.rpc('generate_whatsapp_messages', {
                p_message_template: composedMessage,
                p_objects_data: objectsToNotify
            });

            if (error) throw error;

            if (messagesData && messagesData.length > 0) {
                // Mapeia os dados das mensagens para os dados dos objetos originais para obter o control_number
                const fullData = messagesData.map((msg, index) => ({
                    ...msg,
                    control_number: objectsToNotify[index].control_number
                }));

                const htmlContent = generateHtmlForNotifications(fullData);
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = 'notificacoes_whatsapp.html';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success(`Arquivo HTML com ${fullData.length} notificações gerado!`);
                setIsComposerModalOpen(false);
                setObjectsToNotify([]);
            } else {
                toast.error("Não foi possível gerar as mensagens.");
            }
        } catch (error) {
            toast.error(handleSupabaseError(error));
        } finally {
            setIsSending(false);
        }
    };

    // CORREÇÃO: Nova função auxiliar para criar o conteúdo do arquivo HTML.
    const generateHtmlForNotifications = (data) => {
        const styles = `body{background:linear-gradient(to bottom left,#1a1d24,#272b35);min-height:100vh;font-family:sans-serif;padding:20px;margin:0}.grid-container{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:20px}.container{cursor:pointer;text-align:center;transition:opacity .3s,transform .3s}.imagem{position:relative;display:inline-block}img{width:120px;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,.4)}.texto{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:1.5rem;font-weight:700;text-shadow:2px 2px 4px rgba(0,0,0,.7)}a{text-decoration:none}.hidden{opacity:.2;transform:scale(.9);pointer-events:none}`;
        const script = `function ocultarDiv(e){e.classList.add("hidden")}`;

        const divs = data.map(item => {
            const phoneNumber = item.phone_number.replace(/\D/g, '');
            const encodedMessage = encodeURIComponent(item.message);
            const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodedMessage}`;
            
            return `
<div id="${item.control_number}" class="container" onclick="ocultarDiv(this)">
    <a href="${whatsappUrl}" target="_blank">
        <div class="imagem">
            <img src="https://i.imgur.com/S5h76II.png" alt="Ícone de mensagem" />
            <div class="texto">${item.control_number}</div>
        </div>
    </a>
</div>`;
        }).join('');

        return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Notificações WhatsApp</title><style>${styles}</style></head><body><div class="grid-container">${divs}</div><script>${script}</script></body></html>`;
    };


    const onArchiveAction = async () => {
        const success = await handleArchiveAction();
        if (success) setStatusFilters(new Set(['Aguardando Retirada']));
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

    const handleFilterToggle = (filter) => {
        setStatusFilters(prev => {
            const newFilters = new Set(prev);
            if (filter === 'Arquivados') return new Set(['Arquivados']);
            if (newFilters.has('Arquivados')) return new Set([filter]);
            newFilters.has(filter) ? newFilters.delete(filter) : newFilters.add(filter);
            return newFilters.size === 0 ? new Set(['Aguardando Retirada']) : newFilters;
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

    const handleSelectObject = (controlNumber) => {
        setSelectedObjects(prev => {
            const newSelection = new Set(prev);
            newSelection.has(controlNumber) ? newSelection.delete(controlNumber) : newSelection.add(controlNumber);
            return newSelection;
        });
    };

    // --- Funções do Ligador Rápido ---
    const startFastLinker = async () => {
        setIsLinkerLoading(true);
        const { data, error } = await supabase.rpc('get_unlinked_objects');
        if (error) {
            toast.error(handleSupabaseError(error));
        } else if (data && data.length > 0) {
            setObjectsToLink(data);
            setCurrentLinkerIndex(0);
            setIsLinkerModalOpen(true);
        } else {
            toast.success('Todos os objetos já estão ligados a clientes!');
        }
        setIsLinkerLoading(false);
    };

    const handleLinkObjectAndAdvance = async (customerId) => {
        setIsLinkerLoading(true);
        const objectToLink = objectsToLink[currentLinkerIndex];
        const { error } = await supabase.rpc('link_object_to_customer', {
            p_control_number: objectToLink.control_number,
            p_customer_id: customerId
        });

        if (error) {
            toast.error(handleSupabaseError(error));
        } else {
            toast.success(`Objeto ${objectToLink.control_number} ligado!`);
            if (currentLinkerIndex < objectsToLink.length - 1) {
                setCurrentLinkerIndex(prev => prev + 1);
            } else {
                toast.success('Todos os objetos foram processados!');
                setIsLinkerModalOpen(false);
                refetch();
            }
        }
        setIsLinkerLoading(false);
    };

    const handleSkipObject = () => {
        if (currentLinkerIndex < objectsToLink.length - 1) {
            setCurrentLinkerIndex(prev => prev + 1);
        } else {
            toast.success('Todos os objetos foram processados!');
            setIsLinkerModalOpen(false);
            refetch();
        }
    };

    const handleGoBackObject = () => {
        if (currentLinkerIndex > 0) {
            setCurrentLinkerIndex(prev => prev - 1);
        }
    };

    return (
        <div className={styles.container}>
            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={objectToEdit ? 'Editar Objeto' : 'Adicionar Novo Objeto'}>
                <ObjectForm onSave={onSave} onClose={() => setIsModalOpen(false)} objectToEdit={objectToEdit} loading={isSaving} />
            </Modal>
            <Modal isOpen={isBulkSimpleModalOpen} onClose={() => setIsBulkSimpleModalOpen(false)} title="Inserir Objetos Simples em Massa">
                <BulkObjectForm onSave={handleSaveBulkSimple} onClose={() => setIsBulkSimpleModalOpen(false)} loading={isSaving} />
            </Modal>
            <Modal isOpen={isBulkRegisteredModalOpen} onClose={() => setIsBulkRegisteredModalOpen(false)} title="Inserir Objetos Registrados em Massa">
                <BulkRegisteredForm onSave={handleSaveBulkRegistered} onClose={() => setIsBulkRegisteredModalOpen(false)} loading={isSaving} />
            </Modal>
            <Modal isOpen={isBulkNotifyModalOpen} onClose={() => setIsBulkNotifyModalOpen(false)} title="Gerar Notificações em Lote">
                <BulkNotifyForm onSave={handleGenerateNotifications} onClose={() => setIsBulkNotifyModalOpen(false)} loading={isSaving} />
            </Modal>
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Relatório de Inserção">
                <BulkImportReport reportData={reportData} onClose={() => setIsReportModalOpen(false)} />
            </Modal>
            <Modal isOpen={isLinkerModalOpen} onClose={() => setIsLinkerModalOpen(false)} hideHeader={true}>
                <FastLinkerModal
                    isOpen={isLinkerModalOpen}
                    onClose={() => setIsLinkerModalOpen(false)}
                    object={objectsToLink[currentLinkerIndex]}
                    onLink={handleLinkObjectAndAdvance}
                    onSkip={handleSkipObject}
                    onBack={handleGoBackObject}
                    loading={isLinkerLoading}
                    total={objectsToLink.length}
                    current={currentLinkerIndex}
                />
            </Modal>
            
            <Modal isOpen={isComposerModalOpen} onClose={() => setIsComposerModalOpen(false)} title={`Compor Notificação para ${objectsToNotify.length} Objeto(s)`}>
                 <MessageComposerModal
                    onClose={() => setIsComposerModalOpen(false)}
                    onSave={handleSendNotifications}
                    loading={isSending}
                    objectsToNotify={objectsToNotify}
                />
            </Modal>

            <Modal isOpen={!!objectToSuggestFor} onClose={() => setObjectToSuggestFor(null)} title="Ligar Objeto a Cliente">
                <SuggestionModal 
                    isOpen={!!objectToSuggestFor}
                    onClose={() => setObjectToSuggestFor(null)} 
                    object={objectToSuggestFor} 
                    onLink={handleLinkObject} 
                    loading={isSaving} 
                />
            </Modal>

            {/* Page Content */}
            <ObjectsHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedObjects={selectedObjects}
                onBulkUpdateStatus={(status) => handleBulkUpdateStatus(selectedObjects, status)}
                onStartFastLinker={startFastLinker}
                isLinkerLoading={isLinkerLoading}
                onBulkNotify={() => setIsBulkNotifyModalOpen(true)}
                onBulkRegistered={() => setIsBulkRegisteredModalOpen(true)}
                onBulkSimple={() => setIsBulkSimpleModalOpen(true)}
                onNewObject={() => { setObjectToEdit(null); setIsModalOpen(true); }}
            />
            
            <ObjectsFilterBar
                statusFilters={statusFilters}
                handleFilterToggle={handleFilterToggle}
                statusCounts={statusCounts}
                onArchiveAction={onArchiveAction}
            />

            <ObjectsTable
                loading={loading}
                objects={objects}
                contactMap={contactMap}
                selectedObjects={selectedObjects}
                statusFilters={statusFilters}
                sortConfig={sortConfig}
                requestSort={requestSort}
                handleSelectAll={handleSelectAll}
                handleSelectObject={handleSelectObject}
                setObjectToEdit={setObjectToEdit}
                setIsModalOpen={setIsModalOpen}
                startNotificationProcess={() => {}}
                setObjectToSuggestFor={setObjectToSuggestFor}
                updateObjectStatus={updateObjectStatus}
                handleRevertStatus={handleRevertStatus}
                handleUnarchive={handleUnarchive}
            />
            
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
