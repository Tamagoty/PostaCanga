// path: src/components/ObjectsTable.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../pages/ObjectsPage.module.css';
import { FaEdit, FaCheckCircle, FaUndoAlt, FaWhatsapp, FaHistory, FaPhone, FaPhoneSlash, FaUndo, FaLink, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import ProgressBar from './ProgressBar';
import TableSkeleton from './TableSkeleton';

const ContactStatus = ({ obj }) => {
    const { customer_id, recipient_name, customer_is_active, customer_cellphone, contact_is_active, contact_cellphone } = obj;
    let icon = null;
    let title = '';

    if (!customer_id) {
        icon = <FaPhoneSlash className={`${styles.contactIcon} ${styles.noContact}`} />;
        title = 'Objeto não associado a um cliente';
    } else if (!customer_is_active) {
        icon = <FaPhoneSlash className={`${styles.contactIcon} ${styles.inactive}`} />;
        title = 'Cliente associado, mas inativo';
    } else if (customer_cellphone) {
        icon = <FaPhone className={`${styles.contactIcon} ${styles.hasContact}`} />;
        title = 'Cliente possui contato telefônico direto';
    } else if (contact_cellphone && contact_is_active) {
        icon = <FaPhone className={`${styles.contactIcon} ${styles.responsible}`} />;
        title = 'Utilizando telefone do contato responsável';
    } else {
        icon = <FaPhoneSlash className={`${styles.contactIcon} ${styles.noContact}`} />;
        title = 'Cliente associado, mas sem telefone válido';
    }

    const content = <span className={styles.recipientName} title={title}>{icon}{recipient_name}</span>;

    return customer_id ? <Link to={`/customers/${customer_id}`} className={styles.recipientNameLink}>{content}</Link> : content;
};

const getAddressText = (obj) => {
    if (obj.delivery_street_name) return `${obj.delivery_street_name}, ${obj.delivery_address_number || 'S/N'}`;
    if (obj.customer_address?.street_name) return `${obj.customer_address.street_name}, ${obj.customer_address.number || 'S/N'}`;
    return 'Não informado';
};

const ObjectsTable = ({
    loading, objects, contactMap, selectedObjects, statusFilters,
    sortConfig, requestSort, handleSelectAll, handleSelectObject,
    setObjectToEdit, setIsModalOpen, startNotificationProcess,
    setObjectToSuggestFor, updateObjectStatus, handleRevertStatus, handleUnarchive
}) => {

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return null;
        return sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />;
    };

    if (loading) {
        return <div className={styles.tableContainer}><TableSkeleton columns={6} rows={10} /></div>;
    }

    return (
        <div className={styles.tableContainer}>
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
                    {objects.map(obj => (
                        <tr key={obj.control_number}>
                            {!statusFilters.has('Arquivados') && <td className={styles.checkboxCell}>{obj.status === 'Aguardando Retirada' && <input type="checkbox" checked={selectedObjects.has(obj.control_number)} onChange={() => handleSelectObject(obj.control_number)} />}</td>}
                            <td data-label="N° Controle">{obj.control_number}</td>
                            <td data-label="Destinatário">
                                <div className={styles.recipientInfo}>
                                    <ContactStatus obj={obj} />
                                    <span className={styles.recipientSub}>{obj.tracking_code || obj.object_type}</span>
                                </div>
                            </td>
                            <td data-label="Endereço">{getAddressText(obj)}</td>
                            <td data-label="Prazo de Guarda"><ProgressBar startDate={obj.arrival_date} endDate={obj.storage_deadline} status={obj.status} /></td>
                            <td data-label="Ações">
                                <div className={styles.actionButtons}>
                                    {obj.is_archived ? (<button className={styles.actionButton} title="Recuperar Objeto" onClick={() => handleUnarchive(obj.control_number)}><FaHistory /></button>) : (
                                        <>
                                            {!obj.customer_id && obj.status === 'Aguardando Retirada' && (<button className={`${styles.actionButton} ${styles.link}`} title="Sugerir e Associar Cliente" onClick={() => setObjectToSuggestFor(obj)}><FaLink /></button>)}
                                            {!!contactMap[obj.recipient_name] && obj.status === 'Aguardando Retirada' && (<button className={`${styles.actionButton} ${styles.whatsapp}`} title="Notificar via WhatsApp" onClick={() => startNotificationProcess('single', obj)}><FaWhatsapp /></button>)}
                                            <button className={styles.actionButton} title="Editar" onClick={() => { setObjectToEdit(obj); setIsModalOpen(true); }}><FaEdit /></button>
                                            {obj.status === 'Aguardando Retirada' && (<><button className={`${styles.actionButton} ${styles.deliver}`} title="Entregar" onClick={() => updateObjectStatus(obj.control_number, 'deliver')}><FaCheckCircle /></button><button className={`${styles.actionButton} ${styles.return}`} title="Devolver" onClick={() => updateObjectStatus(obj.control_number, 'return')}><FaUndoAlt /></button></>)}
                                            {(obj.status === 'Entregue' || obj.status === 'Devolvido') && (<button className={styles.actionButton} title="Reverter Status" onClick={() => handleRevertStatus(obj.control_number)}><FaUndo /></button>)}
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ObjectsTable;
