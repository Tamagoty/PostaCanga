// path: src/components/CustomerForm.jsx
// VERSÃO 7: Corrigida a lógica de busca de CEP genérico para garantir que o modal
// de novo endereço seja aberto corretamente e a execução seja interrompida.

import React, { useState, useEffect, useCallback } from "react";
import styles from "./CustomerForm.module.css";
import Input from "./Input";
import Button from "./Button";
import Modal from "./Modal";
import AddressForm from "./AddressForm";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { handleSupabaseError } from '../utils/errorHandler';
import { maskCPF, maskPhone, maskCEP } from '../utils/masks';
import useDebounce from '../hooks/useDebounce';
import { FaPlus } from "react-icons/fa";

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
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [cepForManualAdd, setCepForManualAdd] = useState("");

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

  const autoFetchAddress = useCallback(async () => {
      const cleanedCep = debouncedCep.replace(/\D/g, "");
      if (cleanedCep.length !== 8) {
        setFoundAddress(null);
        return;
      }
      
      setCepLoading(true);
      setFoundAddress(null);
      setFormData(prev => ({ ...prev, address_id: '' }));

      try {
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const viaCepData = await viaCepResponse.json();

        if (viaCepData.erro) {
          toast.error("CEP não encontrado. Cadastre o endereço manualmente.");
          setCepForManualAdd(debouncedCep);
          setIsAddressModalOpen(true);
          setCepLoading(false);
          return;
        }

        const isGenericCep = !viaCepData.logradouro;

        if (isGenericCep) {
          toast.info("CEP de cidade/região. Especifique a rua para cadastrar.");
          setCepForManualAdd(debouncedCep);
          setIsAddressModalOpen(true);
          setCepLoading(false);
          return;
        }
        
        const { data: existingAddress, error: findError } = await supabase.rpc('find_address_by_details', {
            p_cep: viaCepData.cep,
            p_street_name: viaCepData.logradouro,
            p_city_name: viaCepData.localidade,
            p_state_uf: viaCepData.uf
        });

        if (findError) throw findError;

        if (existingAddress) {
          setFormData(prev => ({ ...prev, address_id: existingAddress.id }));
          setFoundAddress({ street: existingAddress.street_name, city: viaCepData.localidade, state: viaCepData.uf });
          toast.success("Endereço existente selecionado!");
        } else {
          toast.loading('Endereço novo, a cadastrar...');
          
          const { data: cityData, error: cityError } = await supabase
              .from('cities')
              .select('id')
              .ilike('name', viaCepData.localidade)
              .single();

          if (cityError || !cityData) {
              toast.error('Cidade do CEP não encontrada no banco de dados.');
              throw cityError || new Error('Cidade não encontrada');
          }

          const { data: newAddress, error: createError } = await supabase.rpc('create_or_update_address', {
              p_cep: viaCepData.cep.replace(/\D/g, ''),
              p_street_name: viaCepData.logradouro,
              p_neighborhood: viaCepData.bairro,
              p_city_id: cityData.id,
              p_address_id: null
          });

          if (createError) throw createError;
          
          toast.dismiss();
          toast.success('Endereço novo cadastrado e selecionado!');
          await fetchAddressOptions();
          setFormData(prev => ({ ...prev, address_id: newAddress.id }));
          setFoundAddress({ street: newAddress.street_name, city: viaCepData.localidade, state: viaCepData.uf });
        }

      } catch (error) {
        toast.dismiss();
        toast.error(handleSupabaseError(error));
      } finally {
        setCepLoading(false);
      }
  }, [debouncedCep, fetchAddressOptions]);

  const searchContacts = useCallback(async () => {
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
  }, [debouncedContactSearch]);

  useEffect(() => {
    if (debouncedCep) {
        autoFetchAddress();
    }
  }, [debouncedCep, autoFetchAddress]);

  useEffect(() => {
    searchContacts();
  }, [searchContacts]);

  useEffect(() => {
    fetchAddressOptions();
  }, [fetchAddressOptions]);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        full_name: customerToEdit.full_name || "", 
        cpf: customerToEdit.cpf || "", 
        cellphone: customerToEdit.cellphone || "",
        birth_date: customerToEdit.birth_date ? new Date(customerToEdit.birth_date).toISOString().split("T")[0] : "",
        email: customerToEdit.email || "", 
        contact_customer_id: customerToEdit.contact_customer_id || "",
        address_id: customerToEdit.address_id || "",
        address_number: customerToEdit.address_number || "",
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
  
  const handleCepChange = (e) => {
    setCep(maskCEP(e.target.value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast.error("O nome completo é obrigatório.");
      return;
    }
    onSave(formData);
  };

  const handleSaveNewAddress = async (addressData) => {
    setIsSavingAddress(true);
    const { data: newAddress, error } = await supabase.rpc('create_or_update_address', addressData);

    if (error) {
        toast.error(handleSupabaseError(error));
    } else {
        toast.success('Novo endereço criado com sucesso!');
        await fetchAddressOptions();
        setFormData(prev => ({ ...prev, address_id: newAddress.id }));
        setIsAddressModalOpen(false);
    }
    setIsSavingAddress(false);
  };

  return (
    <>
      <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Adicionar Novo Endereço">
          <AddressForm 
            onSave={handleSaveNewAddress}
            onClose={() => setIsAddressModalOpen(false)}
            initialCep={cep}
            loading={isSavingAddress}
          />
      </Modal>

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
                          <span className={styles.searchResultAddress}>{contact.address_info}</span>
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
            <Input id="cep-lookup" name="cep-lookup" label="Buscar Endereço por CEP" value={cep} onChange={handleCepChange} maxLength="9" />
            {cepLoading && <div className={styles.loader}></div>}
          </div>

          {foundAddress && (
            <div className={styles.foundAddressDisplay}>
              {foundAddress.street}, {foundAddress.city}/{foundAddress.state}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="address_id">Rua / Logradouro</label>
            <div className={styles.addressSelectGroup}>
              <select id="address_id" name="address_id" value={formData.address_id || ''} onChange={handleChange} className={styles.select}>
                <option value="">Selecione um endereço ou busque por CEP</option>
                {addressOptions.map((addr) => (
                  <option key={addr.id} value={addr.id}>
                    {`${addr.street_name}${addr.neighborhood ? ` (${addr.neighborhood})` : ''} - ${addr.city.name}/${addr.city.state.uf}`}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setIsAddressModalOpen(true)} className={styles.newAddressBtn}>
                <FaPlus /> Novo
              </button>
            </div>
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
    </>
  );
};

export default CustomerForm;
