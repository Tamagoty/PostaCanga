// path: src/components/ObjectsHeader.jsx
import React from 'react';
import styles from '../pages/ObjectsPage.module.css';
import { FaBell, FaSearch, FaPlus, FaCheckCircle, FaUndoAlt, FaPaperPlane, FaCopy, FaBoxes, FaFileCsv } from 'react-icons/fa';
import Input from './Input';
import Button from './Button';

const ObjectsHeader = ({
  searchTerm,
  setSearchTerm,
  selectedObjects,
  onBulkUpdateStatus,
  onExportExpiring,
  onBulkNotify,
  onStartNotificationProcess,
  onExportTrackingCodes,
  onBulkRegistered,
  onBulkSimple,
  onNewObject,
}) => {
  return (
    <header className={styles.header}>
      <h1>Gerenciamento de Objetos</h1>
      <div className={styles.actions}>
        <div className={styles.searchInputWrapper}>
          <Input id="search" placeholder="Buscar..." icon={FaSearch} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        {selectedObjects.size > 0 && (
          <>
            <Button onClick={() => onBulkUpdateStatus('Entregue')} className={styles.bulkDeliverButton}>
              <FaCheckCircle /> Entregar ({selectedObjects.size})
            </Button>
            <Button onClick={() => onBulkUpdateStatus('Devolvido')} className={styles.bulkReturnButton}>
              <FaUndoAlt /> Devolver ({selectedObjects.size})
            </Button>
          </>
        )}

        <Button onClick={onExportExpiring} variant="secondary"><FaFileCsv /> Exportar Vencimentos</Button>
        <Button onClick={onBulkNotify} variant="secondary"><FaBell /> Notificar em Lote</Button>
        {selectedObjects.size > 0 && <Button onClick={() => onStartNotificationProcess('bulk')} variant="secondary"><FaPaperPlane /> Notificar ({selectedObjects.size})</Button>}
        {selectedObjects.size > 0 && <Button onClick={onExportTrackingCodes} variant="secondary"><FaCopy /> Exportar Códigos</Button>}
        <Button onClick={onBulkRegistered} variant="secondary"><FaBoxes /> Inserir Registrados</Button>
        <Button onClick={onBulkSimple} variant="secondary"><FaBoxes /> Inserir Simples</Button>
        <Button onClick={onNewObject}><FaPlus /> Novo Objeto</Button>
      </div>
    </header>
  );
};

export default ObjectsHeader;
