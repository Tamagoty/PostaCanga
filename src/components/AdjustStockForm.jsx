// Arquivo: src/components/AdjustStockForm.jsx
import React, { useState } from 'react';
import styles from './AdjustStockForm.module.css'; // Usando o novo CSS dedicado
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

const AdjustStockForm = ({ onSave, onClose, loading, supplyName, actionType }) => {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const isAdding = actionType === 'add';
  const modalTitle = isAdding ? 'Adicionar Estoque' : 'Remover Estoque';
  const quantityLabel = isAdding ? 'Quantidade a Adicionar' : 'Quantidade a Remover';
  const headerClass = isAdding ? styles.headerAdd : styles.headerRemove;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('A quantidade deve ser um número positivo.');
      return;
    }
    // Converte para negativo se a ação for de remoção
    const finalQuantity = isAdding ? quantity : -quantity;
    onSave({ quantity: finalQuantity, reason });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={`${styles.modalHeader} ${headerClass}`}>
        <h3>{modalTitle}</h3>
        <p>Item: <strong>{supplyName}</strong></p>
      </div>

      <fieldset className={styles.fieldset}>
        <Input
          id="quantity"
          name="quantity"
          label={quantityLabel}
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.abs(parseInt(e.target.value, 10)) || 1)}
          required
          min="1"
        />
        <div className={styles.formGroup}>
          <label htmlFor="reason">Motivo (Opcional)</label>
          <textarea
            id="reason"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={styles.textarea}
            rows="3"
            placeholder="Ex: Compra de novo lote, uso no escritório, etc."
          />
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Salvando...' : 'Confirmar Ajuste'}
        </Button>
      </div>
    </form>
  );
};

export default AdjustStockForm;
