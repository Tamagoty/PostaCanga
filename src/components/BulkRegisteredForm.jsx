// Arquivo: src/components/BulkRegisteredForm.jsx
// MELHORIA (v3): O seletor de "Tipo de Objeto" para itens não classificados agora busca os dados dinamicamente.

import React, { useState, useEffect } from 'react';
import styles from './BulkRegisteredForm.module.css';
import Button from './Button';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/errorHandler';

const BulkRegisteredForm = ({ onSave, onClose, loading }) => {
  const [textData, setTextData] = useState('');
  const [unclassifiedObjects, setUnclassifiedObjects] = useState([]);
  const [classifiedObjects, setClassifiedObjects] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [objectTypes, setObjectTypes] = useState([]); // Estado para os tipos

  // Busca os tipos de objeto do banco de dados
  useEffect(() => {
    const fetchObjectTypes = async () => {
      const { data, error } = await supabase.from('object_types').select('name').order('name');
      if (error) {
        toast.error(handleSupabaseError(error));
      } else if (data) {
        setObjectTypes(data.map(item => item.name));
      }
    };
    fetchObjectTypes();
  }, []);

  const handleProcessData = async () => {
    if (!textData.trim()) { toast.error('Por favor, cole os dados na área de texto.'); return; }
    setIsProcessing(true);
    try {
      const { data: rules, error: rulesError } = await supabase.from('tracking_code_rules').select('*');
      if (rulesError) throw rulesError;

      const lines = textData.trim().split('\n');
      const parsedObjects = lines.map(line => {
        const columns = line.split('\t');
        if (columns.length >= 10) {
          return {
            tracking_code: columns[1].trim().toUpperCase(),
            order_number: parseInt(columns[3].trim(), 10),
            street_name: columns[6].trim(),
            address_number: columns[7].trim(),
            address_complement: columns[8].trim(),
            recipient_name: columns[9].trim()
          };
        }
        return null;
      }).filter(item => item && item.recipient_name && !isNaN(item.order_number));

      if (parsedObjects.length === 0) { toast.error('Nenhum objeto válido encontrado.'); setIsProcessing(false); return; }

      const classified = [];
      const unclassified = [];
      const defaultUnclassifiedType = objectTypes.find(t => t === 'Encomenda PAC') || objectTypes[0] || 'Registrado';

      parsedObjects.forEach(obj => {
        const rule = rules.find(r => obj.tracking_code.startsWith(r.prefix));
        if (rule) {
          classified.push({ ...obj, object_type: rule.object_type });
        } else {
          unclassified.push({ ...obj, object_type: defaultUnclassifiedType });
        }
      });

      if (unclassified.length > 0) {
        setClassifiedObjects(classified);
        setUnclassifiedObjects(unclassified);
        toast.error(`${unclassified.length} objeto(s) não foram reconhecidos. Por favor, classifique-os.`);
      } else {
        const finalObjects = classified.sort((a, b) => a.order_number - b.order_number).map(({ order_number, ...rest }) => rest);
        onSave({ objects: finalObjects });
      }
    } catch (error) {
      toast.error(handleSupabaseError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualClassificationChange = (index, value) => {
    const updatedObjects = [...unclassifiedObjects];
    updatedObjects[index].object_type = value;
    setUnclassifiedObjects(updatedObjects);
  };

  const handleConfirmAndSave = async () => {
    const newRules = unclassifiedObjects.map(obj => ({
        prefix: obj.tracking_code.substring(0, 2),
        object_type: obj.object_type,
        storage_days: obj.object_type.includes('Carta') || obj.object_type.includes('Cartão') ? 20 : 7
    }));

    for (const rule of newRules) {
        const { error } = await supabase.rpc('create_or_update_tracking_rule', {
            p_rule_id: null, p_prefix: rule.prefix, p_object_type: rule.object_type, p_storage_days: rule.storage_days
        });
        if (error) {
            toast.error(handleSupabaseError(error));
            return;
        }
    }
    toast.success('Novas regras de rastreio salvas!');

    const allObjects = [...classifiedObjects, ...unclassifiedObjects];
    allObjects.sort((a, b) => a.order_number - b.order_number);
    const finalObjects = allObjects.map(({ order_number, ...rest }) => rest);
    onSave({ objects: finalObjects });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados dos Objetos Registrados</legend>
        <div className={styles.formGroup}>
          <label htmlFor="textData">Cole os dados aqui</label>
          <textarea id="textData" value={textData} onChange={(e) => setTextData(e.target.value)}
            className={styles.textarea} rows="8" placeholder="Cole os dados do seu sistema aqui..." required
            disabled={unclassifiedObjects.length > 0} />
        </div>
      </fieldset>

      {unclassifiedObjects.length > 0 && (
        <fieldset className={styles.fieldset}>
          <legend>Classificar Objetos Não Reconhecidos</legend>
          <div className={styles.unclassifiedList}>
            {unclassifiedObjects.map((obj, index) => (
              <div key={index} className={styles.unclassifiedItem}>
                <div className={styles.itemInfo}><strong>{obj.tracking_code}</strong><span>{obj.recipient_name}</span></div>
                <select value={obj.object_type} onChange={(e) => handleManualClassificationChange(index, e.target.value)} className={styles.select}>
                  {objectTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        {unclassifiedObjects.length === 0 ? (
          <Button type="button" onClick={handleProcessData} loading={isProcessing} disabled={loading}>{isProcessing ? 'Processando...' : 'Processar e Inserir'}</Button>
        ) : (
          <Button type="button" onClick={handleConfirmAndSave} loading={loading}>Confirmar e Inserir</Button>
        )}
      </div>
    </form>
  );
};

export default BulkRegisteredForm;
