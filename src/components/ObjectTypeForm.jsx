// Arquivo: src/components/ObjectTypeForm.jsx
import React, { useState, useEffect } from "react";
import styles from "./EmployeeForm.module.css";
import Input from "./Input";
import Button from "./Button";
import toast from "react-hot-toast";

const ObjectTypeForm = ({ onSave, onClose, typeToEdit, loading }) => {
  const [formData, setFormData] = useState({
    name: "",
    default_storage_days: 20,
  });

  useEffect(() => {
    if (typeToEdit) {
      setFormData({
        name: typeToEdit.name || "",
        default_storage_days: typeToEdit.default_storage_days || 20,
      });
    }
  }, [typeToEdit]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("O nome do tipo de objeto é obrigatório.");
      return;
    }
    const payload = {
      type_id: typeToEdit?.id || null,
      name: formData.name,
      default_storage_days: formData.default_storage_days,
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Detalhes do Tipo de Objeto</legend>
        <Input
          id="name"
          name="name"
          label="Nome (ex: Encomenda Internacional)"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <Input
          id="default_storage_days"
          name="default_storage_days"
          label="Prazo de Guarda Padrão (dias)"
          type="number"
          value={formData.default_storage_days}
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
          {loading ? "Salvando..." : "Salvar Tipo"}
        </Button>
      </div>
    </form>
  );
};

export default ObjectTypeForm;
