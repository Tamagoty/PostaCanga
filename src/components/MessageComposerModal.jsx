// path: src/components/MessageComposerModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './MessageComposerModal.module.css';
import Button from './Button';
import { FaGripVertical, FaCopy } from 'react-icons/fa';
import { format, differenceInDays } from 'date-fns';

const VARIABLE_MAP = {
  '{{NOME_CLIENTE}}': 'Nome do Cliente',
  '{{TIPO_OBJETO}}': 'Tipo do Objeto',
  '{{CODIGO_RASTREIO}}': 'Cód. de Rastreio',
  '{{NUMERO_CONTROLE}}': 'Nº de Controle',
  '{{DIAS_RESTANTES}}': 'Dias Restantes',
  '{{DATA_PRAZO}}': 'Data do Prazo',
  '{{NOME_DA_AGENCIA}}': 'Nome da Agência',
  '{{ENDERECO_AGENCIA}}': 'Endereço da Agência',
};

// CORREÇÃO: O componente agora recebe 'objectsToNotify' para pré-visualização
const MessageComposerModal = ({ onSave, onClose, loading, objectsToNotify }) => {
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [composedMessage, setComposedMessage] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      const { data, error } = await supabase.rpc('get_message_templates');
      if (error) {
        toast.error("Não foi possível carregar os modelos de mensagem.");
      } else {
        setAllTemplates(data || []);
        // Pré-seleciona o primeiro template se ele existir
        if (data && data.length > 0) {
            setSelectedTemplates([data[0]]);
        }
      }
      setIsLoadingTemplates(false);
    };
    fetchTemplates();
  }, []);

  // CORREÇÃO: Lógica de composição e pré-visualização atualizada
  useEffect(() => {
    const message = selectedTemplates.map(t => t.content).join('\n\n');
    setComposedMessage(message);

    // Gera uma pré-visualização com os dados do primeiro objeto da lista
    if (objectsToNotify && objectsToNotify.length > 0 && message) {
      const firstObject = objectsToNotify[0];
      let tempPreview = message;
      
      const deadline = new Date(firstObject.storage_deadline);
      const daysRemaining = differenceInDays(deadline, new Date());

      tempPreview = tempPreview.replace(/{{NOME_CLIENTE}}/g, firstObject.recipient_name);
      tempPreview = tempPreview.replace(/{{TIPO_OBJETO}}/g, firstObject.object_type);
      tempPreview = tempPreview.replace(/{{NUMERO_CONTROLE}}/g, firstObject.control_number);
      tempPreview = tempPreview.replace(/{{DATA_PRAZO}}/g, format(deadline, 'dd/MM/yyyy'));
      tempPreview = tempPreview.replace(/{{DIAS_RESTANTES}}/g, daysRemaining);
      // Adicione outras substituições de variáveis globais se necessário
      // Ex: tempPreview = tempPreview.replace(/{{NOME_DA_AGENCIA}}/g, 'Nome da Agência');

      setPreviewMessage(tempPreview);
    } else {
      setPreviewMessage('');
    }

  }, [selectedTemplates, objectsToNotify]);

  const handleToggleTemplate = (template) => {
    const isSelected = selectedTemplates.some(st => st.id === template.id);
    if (isSelected) {
      setSelectedTemplates(prev => prev.filter(st => st.id !== template.id));
    } else {
      setSelectedTemplates(prev => [...prev, template]);
    }
  };

  const handleSort = () => {
    const selectedTemplatesCopy = [...selectedTemplates];
    const draggedItemContent = selectedTemplatesCopy.splice(dragItem.current, 1)[0];
    selectedTemplatesCopy.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setSelectedTemplates(selectedTemplatesCopy);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!composedMessage.trim()) {
      toast.error('A mensagem não pode estar vazia.');
      return;
    }
    onSave(composedMessage);
  };

  const handleVariableClick = (variable) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Variável ${variable} copiada!`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.composerLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.templateList}>
            <h4>Modelos Disponíveis</h4>
            {isLoadingTemplates ? <p>A carregar...</p> : (
              <div className={styles.buttonGrid}>
                {allTemplates.map(template => {
                  const isSelected = selectedTemplates.some(st => st.id === template.id);
                  return (
                    <button
                      key={template.id}
                      className={`${styles.templateButton} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handleToggleTemplate(template)}
                    >
                      {template.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles.variableHelper}>
            <h4>Variáveis</h4>
            <div className={styles.variableGrid}>
              {Object.entries(VARIABLE_MAP).map(([variable, friendlyName]) => (
                <div key={variable} className={styles.variableTag} title={variable}>
                  <span>{friendlyName}</span>
                  <button onClick={() => handleVariableClick(variable)}><FaCopy /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.messagePreview}>
          <h4>Compositor e Pré-visualização</h4>
          <div className={styles.selectedItemsContainer}>
            {selectedTemplates.length > 0 ? (
              selectedTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className={styles.selectedItem}
                  draggable
                  onDragStart={() => (dragItem.current = index)}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <FaGripVertical className={styles.dragHandle} />
                  <span>{template.name}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>Selecione um modelo para começar</div>
            )}
          </div>
          <textarea
            value={previewMessage || 'A pré-visualização da sua mensagem aparecerá aqui...'}
            readOnly
            className={styles.textarea}
            rows="8"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit} loading={loading} disabled={loading || selectedTemplates.length === 0}>
          {loading ? 'A Enviar...' : 'Confirmar e Enviar'}
        </Button>
      </div>
    </div>
  );
};

export default MessageComposerModal;
