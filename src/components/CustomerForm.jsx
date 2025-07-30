// Arquivo: src/components/CustomerForm.jsx
// CORREÇÃO (v4.3): A função handleSubmit agora envia apenas os dados brutos do formulário,
// deixando a responsabilidade de formatar o payload para a página que a chama.

import React, { useState, useEffect, useCallback } from "react";
import styles from "./CustomerForm.module.css";
import Input from "./Input";
import Button from "./Button";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError } from '../utils/errorHandler';
import { maskCPF, maskPhone } from '../utils/masks';
import useDebounce from '../hooks/useDebounce';

const CustomerForm = ({ onSave, onClose, customerToEdit, loading }) => {
  const initialFormData = {
    full_name: "", cpf: "", cellphone: "", birth_date: "", email: "",
    contact_customer_id: "", address_id: "", address_number: "", address_complement: "",
  };
  const [formData, setFormData] = useState(initialFormData);
  const [addressOptions, setAddressOptions] = useState([]);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState([]);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [foundAddress, setFoundAddress] = useState(null);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);

  const debouncedCep = useDebounce(cep, 500);
  const debouncedContactSearch = useDebounce(contactSearch, 500);

  const fetchAddressOptions = useCallback(async () => {
    const { data: addresses, error } = await supabase
      .from("addresses")
      .select("*, city:cities(name, state:states(uf))")
      .order("street_name");
    if (error) toast.error(handleSupabaseError(error));
    else if (addresses) setAddressOptions(addresses);
  }, []);

  useEffect(() => {
    const autoFetchAddress = async () => {
      const cleanedCep = debouncedCep.replace(/\D/g, "");
      if (cleanedCep.length !== 8) {
        setFoundAddress(null);
        return;
      }
      
      setCepLoading(true);
      setFoundAddress(null);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (data.erro) {
          toast.error("CEP não encontrado.");
        } else {
          const { data: addressId, error } = await supabase.rpc("find_or_create_address_by_cep", {
              p_cep: data.cep, p_street_name: data.logradouro, p_neighborhood: data.bairro,
              p_city_name: data.localidade, p_state_uf: data.uf,
          });
          if (error) throw error;
          
          await fetchAddressOptions();
          setFormData((prev) => ({ ...prev, address_id: addressId }));
          setFoundAddress({ street: data.logradouro, city: data.localidade, state: data.uf });
          toast.success("Endereço encontrado e selecionado!");
        }
      } catch (error) {
        toast.error(handleSupabaseError(error));
      } finally {
        setCepLoading(false);
      }
    };

    if (debouncedCep) {
        autoFetchAddress();
    }
  }, [debouncedCep, fetchAddressOptions]);

  useEffect(() => {
    const searchContacts = async () => {
      if (debouncedContactSearch.length < 2) {
        setContactResults([]);
        return;
      }
      setIsSearchingContacts(true);
      const { data, error } = await supabase.rpc("search_contacts", { p_search_term: debouncedContactSearch });
      if (error) {
        toast.error(handleSupabaseError(error));
        setContactResults([]);
      } else {
        setContactResults(data || []);
      }
      setIsSearchingContacts(false);
    };
    
    searchContacts();
  }, [debouncedContactSearch]);

  useEffect(() => {
    fetchAddressOptions();
  }, [fetchAddressOptions]);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        full_name: customerToEdit.full_name || "", cpf: customerToEdit.cpf || "", cellphone: customerToEdit.cellphone || "",
        birth_date: customerToEdit.birth_date ? new Date(customerToEdit.birth_date).toISOString().split("T")[0] : "",
        email: customerToEdit.email || "", contact_customer_id: customerToEdit.contact_customer_id || "",
        address_id: customerToEdit.address_id || "", address_number: customerToEdit.address_number || "",
        address_complement: customerToEdit.address_complement || "",
      });

      if (customerToEdit.address_id) {
        supabase.rpc('get_address_details_by_id', { p_address_id: customerToEdit.address_id }).then(({ data, error }) => {
          if (!error && data.length > 0) {
            setFoundAddress({ street: data[0].street_name, city: data[0].city_name, state: data[0].state_uf });
          }
        });
      }

      if (customerToEdit.contact_customer_id) {
        supabase.from("customers").select("full_name").eq("id", customerToEdit.contact_customer_id).single()
          .then(({ data, error }) => {
            if (error) toast.error(handleSupabaseError(error));
            else if (data) setSelectedContactName(data.full_name);
          });
      }
    } else {
      setFormData(initialFormData);
      setFoundAddress(null);
      setCep('');
      setContactSearch('');
      setContactResults([]);
      setSelectedContactName('');
    }
  }, [customerToEdit]);

  const handleSelectContact = (contact) => {
    setFormData((prev) => ({ ...prev, contact_customer_id: contact.id }));
    setSelectedContactName(contact.full_name);
    setContactSearch("");
    setContactResults([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData((prev) => ({ ...prev, [name]: maskCPF(value) }));
    } else if (name === 'cellphone') {
      setFormData((prev) => ({ ...prev, [name]: maskPhone(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast.error("O nome completo é obrigatório.");
      return;
    }
    // Apenas devolve os dados puros do formulário
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>Dados Pessoais e Contato</legend>
        <Input id="full_name" name="full_name" label="Nome Completo" value={formData.full_name} onChange={handleChange} required />
        <div className={styles.grid}>
          <Input id="cpf" name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} />
          <Input id="birth_date" name="birth_date" label="Data de Nascimento" type="date" value={formData.birth_date} onChange={handleChange} />
        </div>
        <Input id="cellphone" name="cellphone" label="Telemóvel" value={formData.cellphone} onChange={handleChange} />
        <Input id="email" name="email" label="E-mail" type="email" value={formData.email} onChange={handleChange} />

        {!formData.cellphone && (
          <div className={styles.formGroup}>
            <label>Associar a um Contato</label>
            {selectedContactName ? (
              <div className={styles.selectedContact}>
                <span>{selectedContactName}</span>
                <button type="button" onClick={() => { setSelectedContactName(""); setFormData((prev) => ({ ...prev, contact_customer_id: "" })); }}>
                  Alterar
                </button>
              </div>
            ) : (
              <div className={styles.searchWrapper}>
                <Input id="contact-search" placeholder="Digite para buscar um contato..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                {isSearchingContacts && <div className={styles.loaderSmall}></div>}
                {contactResults.length > 0 && (
                  <ul className={styles.searchResults}>
                    {contactResults.map((contact) => (
                      <li key={contact.id} onClick={() => handleSelectContact(contact)}>
                        {contact.full_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>Endereço</legend>
        <div className={styles.cepGroup}>
          <Input id="cep-lookup" name="cep-lookup" label="Buscar Endereço por CEP" value={cep} onChange={(e) => setCep(e.target.value)} />
          {cepLoading && <div className={styles.loader}></div>}
        </div>

        {foundAddress && (
          <div className={styles.foundAddressDisplay}>
            {foundAddress.street}, {foundAddress.city}/{foundAddress.state}
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="address_id">Rua / Logradouro</label>
          <select id="address_id" name="address_id" value={formData.address_id} onChange={handleChange} className={styles.select}>
            <option value="">Selecione um endereço ou busque por CEP</option>
            {addressOptions.map((addr) => (
              <option key={addr.id} value={addr.id}>
                {`${addr.street_name} - ${addr.city.name}/${addr.city.state.uf}`}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.grid}>
          <Input id="address_number" name="address_number" label="Número" value={formData.address_number} onChange={handleChange} />
          <Input id="address_complement" name="address_complement" label="Complemento" value={formData.address_complement} onChange={handleChange} placeholder="Apto, Bloco, etc." />
        </div>
      </fieldset>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? "A Guardar..." : "Guardar Cliente"}
        </Button>
      </div>
    </form>
  );
};

export default CustomerForm;
