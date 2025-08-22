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
            <Modal isOpen={isLinkerModalOpen} onClose={() => setIsLinkerModalOpen(false)} title="">
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
            {isComposerModalOpen && (
                 <MessageComposerModal
                    isOpen={isComposerModalOpen}
                    onClose={() => setIsComposerModalOpen(false)}
                    objectsToNotify={objectsToNotify}
                />
            )}
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
