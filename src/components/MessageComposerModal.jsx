// path: src/components/MessageComposerModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './MessageComposerModal.module.css';
import Button from './Button';
import { FaGripVertical, FaCopy } from 'react-icons/fa';

// [NOVA LÓGICA] Mapeamento de variáveis para nomes amigáveis
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

const MessageComposerModal = ({ onSave, onClose, loading }) => {
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [composedMessage, setComposedMessage] = useState('');
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
      }
      setIsLoadingTemplates(false);
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    const message = selectedTemplates.map(t => t.content).join('');
    setComposedMessage(message);
  }, [selectedTemplates]);

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
          {/* Coluna da Esquerda: Lista de todos os modelos */}
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
          {/* [NOVA SEÇÃO] Ajuda de Variáveis */}
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

        {/* Coluna da Direita: Mensagem sendo construída */}
        <div className={styles.messagePreview}>
          <h4>Compositor de Mensagem</h4>
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
            value={composedMessage}
            onChange={(e) => setComposedMessage(e.target.value)}
            className={styles.textarea}
            rows="8"
            placeholder="A sua mensagem aparecerá aqui..."
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSubmit} loading={loading} disabled={loading}>
          {loading ? 'A Enviar...' : 'Confirmar e Enviar'}
        </Button>
      </div>
    </div>
  );
};

export default MessageComposerModal;
