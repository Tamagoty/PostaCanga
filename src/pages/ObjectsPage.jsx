// path: src/pages/ObjectsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useDebounce from '../hooks/useDebounce';
import styles from './ObjectsPage.module.css';

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
import { handleSupabaseError } from '../utils/errorHandler';
import toast from 'react-hot-toast';

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
    
    // Debounced search term for performance
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Custom Hooks
    const { objects, contactMap, loading, currentPage, setCurrentPage, sortConfig, requestSort, totalPages, refetch } = useObjects({
        debouncedSearchTerm, itemsPerPage, statusFilters
    });
    
    const { 
        handleSaveObject, updateObjectStatus, handleBulkUpdateStatus, 
        handleRevertStatus, handleArchiveAction, handleUnarchive 
    } = useObjectActions(refetch, setSelectedObjects);

    // Effect for fetching status counts
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

    return (
        <div className={styles.container}>
            {/* Modals */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={objectToEdit ? 'Editar Objeto' : 'Adicionar Novo Objeto'}>
                <ObjectForm onSave={onSave} onClose={() => setIsModalOpen(false)} objectToEdit={objectToEdit} loading={isSaving} />
            </Modal>
            <Modal isOpen={isBulkSimpleModalOpen} onClose={() => setIsBulkSimpleModalOpen(false)} title="Inserir Objetos Simples em Massa">
                <BulkObjectForm onSave={() => {}} onClose={() => setIsBulkSimpleModalOpen(false)} loading={isSaving} />
            </Modal>
            {/* Adicionar outros modais aqui... */}
            <SuggestionModal isOpen={!!objectToSuggestFor} onClose={() => setObjectToSuggestFor(null)} object={objectToSuggestFor} onLink={handleLinkObject} loading={isSaving} />

            {/* Page Content */}
            <ObjectsHeader
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedObjects={selectedObjects}
                onBulkUpdateStatus={(status) => handleBulkUpdateStatus(selectedObjects, status)}
                onExportExpiring={() => {}}
                onBulkNotify={() => setIsBulkNotifyModalOpen(true)}
                onStartNotificationProcess={() => {}}
                onExportTrackingCodes={() => {}}
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
