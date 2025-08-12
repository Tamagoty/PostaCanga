// path: src/components/CustomerForm.jsx
// VERSÃO 11: Substituído o dropdown de endereços por um campo de busca inteligente com debounce.

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
    customer_id: null,
    full_name: "", cpf: "", cellphone: "", birth_date: "", email: "",
    contact_customer_id: null, address_id: null, address_number: "", address_complement: "",
  };
  const [formData, setFormData] = useState(initialFormData);
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

  // Novos estados para a busca de endereço
  const [addressSearch, setAddressSearch] = useState("");
  const [addressResults, setAddressResults] = useState([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);

  const debouncedCep = useDebounce(cep, 500);
  const debouncedContactSearch = useDebounce(contactSearch, 500);
  const debouncedAddressSearch = useDebounce(addressSearch, 400);

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
          return;
        }

        if (!viaCepData.logradouro) {
          toast("CEP de cidade/região. Especifique a rua para cadastrar.");
          setCepForManualAdd(debouncedCep);
          setIsAddressModalOpen(true);
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
          toast('Endereço novo. Preencha os detalhes e adicione-o manualmente se necessário.');
          setCepForManualAdd(debouncedCep);
          setIsAddressModalOpen(true);
        }

      } catch (error) {
        toast.error(handleSupabaseError(error));
      } finally {
        setCepLoading(false);
      }
  }, [debouncedCep]);

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

  const searchAddresses = useCallback(async () => {
    if (debouncedAddressSearch.length < 3) {
      setAddressResults([]);
      return;
    }
    setIsSearchingAddresses(true);
    const { data, error } = await supabase.rpc("search_addresses", { p_search_term: debouncedAddressSearch });
    if (error) {
      toast.error(handleSupabaseError(error));
      setAddressResults([]);
    } else {
      setAddressResults(data || []);
    }
    setIsSearchingAddresses(false);
  }, [debouncedAddressSearch]);

  useEffect(() => {
    if (debouncedCep) {
        autoFetchAddress();
    }
  }, [debouncedCep, autoFetchAddress]);
  
  useEffect(() => {
    if (!cep) { // Só busca por rua se não houver CEP
        searchAddresses();
    }
  }, [debouncedAddressSearch, searchAddresses, cep]);

  useEffect(() => {
    searchContacts();
  }, [searchContacts]);

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        customer_id: customerToEdit.id,
        full_name: customerToEdit.full_name || "", 
        cpf: customerToEdit.cpf || "", 
        cellphone: customerToEdit.cellphone || "",
        birth_date: customerToEdit.birth_date ? new Date(customerToEdit.birth_date).toISOString().split("T")[0] : "",
        email: customerToEdit.email || "", 
        contact_customer_id: customerToEdit.contact_customer_id || null,
        address_id: customerToEdit.address_id || null,
        address_number: customerToEdit.address_number || "",
        address_complement: customerToEdit.address_complement || "",
      });

      if (customerToEdit.address_id) {
         supabase
          .from('addresses')
          .select('*, city:cities(name, state:states(uf))')
          .eq('id', customerToEdit.address_id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setFoundAddress({ street: data.street_name, city: data.city.name, state: data.city.state.uf });
              setAddressSearch(data.street_name);
              setCep(data.cep || '');
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
      setAddressSearch('');
    }
  }, [customerToEdit]);

  const handleSelectContact = (contact) => {
    setFormData((prev) => ({ ...prev, contact_customer_id: contact.id }));
    setSelectedContactName(contact.full_name);
    setContactSearch("");
    setContactResults([]);
  };

  const handleSelectAddress = (address) => {
    setFormData(prev => ({ ...prev, address_id: address.id }));
    setFoundAddress({ street: address.street_name, city: address.city_name, state: address.state_uf });
    setAddressSearch(address.street_name);
    setAddressResults([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cpf') finalValue = maskCPF(value);
    else if (name === 'cellphone') finalValue = maskPhone(value);
    
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };
  
  const handleCepChange = (e) => {
    const maskedCep = maskCEP(e.target.value);
    setCep(maskedCep);
    if (maskedCep) {
        setAddressSearch('');
        setAddressResults([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast.error("O nome completo é obrigatório.");
      return;
    }
    
    const payload = {
      p_customer_id: formData.customer_id,
      p_full_name: formData.full_name,
      p_cpf: formData.cpf || null,
      p_cellphone: formData.cellphone || null,
      p_birth_date: formData.birth_date || null,
      p_contact_customer_id: formData.contact_customer_id || null,
      p_email: formData.email || null,
      p_address_id: formData.address_id || null,
      p_address_number: formData.address_number || null,
      p_address_complement: formData.address_complement || null,
    };
    
    onSave(payload);
  };

  const handleSaveNewAddress = async (addressData) => {
    setIsSavingAddress(true);
    try {
        const { data: newAddress, error } = await supabase.rpc('create_or_update_address', addressData);

        if (error) {
            toast.error(handleSupabaseError(error));
        } else {
            toast.success('Novo endereço criado com sucesso!');
            setFormData(prev => ({ ...prev, address_id: newAddress.id }));
            
            const { data: fullAddress, error: fetchError } = await supabase
                .from('addresses')
                .select('*, city:cities(name, state:states(uf))')
                .eq('id', newAddress.id)
                .single();

            if (fetchError) {
                toast.error("Não foi possível carregar os detalhes do novo endereço.");
            } else if (fullAddress) {
                setFoundAddress({ street: fullAddress.street_name, city: fullAddress.city.name, state: fullAddress.city.state.uf });
                setAddressSearch(fullAddress.street_name);
            }
            
            setIsAddressModalOpen(false);
        }
    } catch (e) {
        toast.error("Ocorreu um erro inesperado ao guardar o endereço.");
    } finally {
        setIsSavingAddress(false);
    }
  };

  return (
    <>
      <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Adicionar Novo Endereço">
          <AddressForm 
            onSave={handleSaveNewAddress}
            onClose={() => setIsAddressModalOpen(false)}
            initialCep={cepForManualAdd}
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
                  <button type="button" onClick={() => { setSelectedContactName(""); setFormData((prev) => ({ ...prev, contact_customer_id: null })); }}>
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
            <label htmlFor="address_search">Rua / Logradouro</label>
            <div className={styles.searchWrapper}>
                <Input
                    id="address_search"
                    name="address_search"
                    placeholder="Digite para buscar um endereço..."
                    value={addressSearch}
                    onChange={(e) => {
                        setAddressSearch(e.target.value);
                        if (formData.address_id) {
                            setFoundAddress(null);
                            setFormData(prev => ({...prev, address_id: null}));
                        }
                    }}
                    disabled={!!cep}
                />
                {isSearchingAddresses && <div className={styles.loaderSmall}></div>}
                {addressResults.length > 0 && (
                    <ul className={styles.searchResults}>
                        {addressResults.map((addr) => (
                            <li key={addr.id} onClick={() => handleSelectAddress(addr)}>
                                {`${addr.street_name}${addr.neighborhood ? ` (${addr.neighborhood})` : ''}`}
                                <span className={styles.searchResultAddress}>{`${addr.city_name}/${addr.state_uf}`}</span>
                            </li>
                        ))}
                    </ul>
                )}
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
