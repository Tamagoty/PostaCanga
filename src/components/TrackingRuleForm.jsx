// Arquivo: src/components/TrackingRuleForm.jsx
import React, { useState, useEffect } from "react";
import styles from "./EmployeeForm.module.css";
import Input from "./Input";
import Button from "./Button";
import toast from "react-hot-toast";

const TrackingRuleForm = ({ onSave, onClose, ruleToEdit, loading }) => {
  const [formData, setFormData] = useState({
    prefix: "",
    object_type: "",
    storage_days: 7,
  });

  useEffect(() => {
    if (ruleToEdit) {
      setFormData({
        prefix: ruleToEdit.prefix || "",
        object_type: ruleToEdit.object_type || "",
        storage_days: ruleToEdit.storage_days || 7,
      });
    }
  }, [ruleToEdit]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.prefix || !formData.object_type) {
      toast.error("Prefixo e Tipo de Objeto são obrigatórios.");
      return;
    }
    const payload = {
      rule_id: ruleToEdit?.id || null,
      prefix: formData.prefix,
      object_type: formData.object_type,
      storage_days: formData.storage_days,
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes da Regra</legend>
        <Input
          id="prefix"
          name="prefix"
          label="Prefixo do Rastreio (ex: AC, BR)"
          value={formData.prefix}
          onChange={handleChange}
          required
        />
        <Input
          id="object_type"
          name="object_type"
          label="Tipo de Objeto (ex: Encomenda PAC)"
          value={formData.object_type}
          onChange={handleChange}
          required
        />
        <Input
          id="storage_days"
          name="storage_days"
          label="Prazo de Guarda (dias)"
          type="number"
          value={formData.storage_days}
          onChange={handleChange}
          required
          min="1"
        />
      </fieldset>
      <div className={styles.formActions}>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? "Salvando..." : "Salvar Regra"}
        </Button>
      </div>
    </form>
  );
};

export default TrackingRuleForm;
