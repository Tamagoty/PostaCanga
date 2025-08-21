// path: src/hooks/useCustomerForm.js
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCep } from './useCep';
import useDebounce from './useDebounce';
import { maskCPF, maskPhone, maskCEP } from '../utils/masks';
import { capitalizeName } from '../utils/formatters';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';

export const useCustomerForm = ({ customerToEdit, onSave }) => {
    const [formData, setFormData] = useState({
        full_name: '', cpf: '', cellphone: '', email: '', birth_date: '',
        contact_customer_id: null, address_id: null, address_number: '',
        address_complement: '', cep: '', street_name: '', neighborhood: '',
        city_name: '', state_uf: ''
    });

    const [contactSearch, setContactSearch] = useState('');
    const [contactSuggestions, setContactSuggestions] = useState([]);
    const [addressSearch, setAddressSearch] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [isSavingAddress, setIsSavingAddress] = useState(false);
    const [initialCepForNewAddress, setInitialCepForNewAddress] = useState('');

    const initialCep = useRef(null);
    const lastProcessedCep = useRef(null);

    const debouncedContactSearch = useDebounce(contactSearch, 500);
    const debouncedAddressSearch = useDebounce(addressSearch, 500);
    const debouncedCep = useDebounce(formData.cep, 800);

    const handleCepSuccess = (cepData) => {
        if (!cepData.logradouro && cepData.localidade) {
            toast('Este é um CEP geral. Por favor, cadastre o endereço completo.');
            setInitialCepForNewAddress(cepData.cep);
            setIsAddressModalOpen(true);
        } else {
            setFormData(prev => ({
                ...prev,
                street_name: cepData.logradouro,
                neighborhood: cepData.bairro,
                city_name: cepData.localidade,
                state_uf: cepData.uf,
                address_id: null,
            }));
            toast.success('Endereço preenchido automaticamente!');
        }
    };

    const { isCepLoading, triggerCepFetch } = useCep(handleCepSuccess);

    useEffect(() => {
        if (customerToEdit) {
            const cepValue = customerToEdit.address?.cep || '';
            setFormData({
                full_name: customerToEdit.full_name || '',
                cpf: customerToEdit.cpf ? maskCPF(customerToEdit.cpf) : '',
                cellphone: customerToEdit.cellphone ? maskPhone(customerToEdit.cellphone) : '',
                email: customerToEdit.email || '',
                birth_date: customerToEdit.birth_date || '',
                contact_customer_id: customerToEdit.contact_customer_id || null,
                address_id: customerToEdit.address_id || null,
                address_number: customerToEdit.address_number || '',
                address_complement: customerToEdit.address_complement || '',
                cep: maskCEP(cepValue),
                street_name: customerToEdit.address?.street_name || '',
                neighborhood: customerToEdit.address?.neighborhood || '',
                city_name: customerToEdit.address?.city || '',
                state_uf: customerToEdit.address?.state || ''
            });
            initialCep.current = maskCEP(cepValue);
            if (customerToEdit.contact_full_name) {
                setContactSearch(customerToEdit.contact_full_name);
            }
        } else {
            initialCep.current = null;
        }
    }, [customerToEdit]);

    useEffect(() => {
        const getContactSuggestions = async () => {
            if (debouncedContactSearch.length < 3 || formData.contact_customer_id) {
                setContactSuggestions([]);
                return;
            }
            const { data, error } = await supabase.rpc('search_contacts', { p_search_term: debouncedContactSearch });
            setContactSuggestions(error ? [] : data || []);
        };
        getContactSuggestions();
    }, [debouncedContactSearch, formData.contact_customer_id]);

    useEffect(() => {
        const getAddressSuggestions = async () => {
            if (debouncedAddressSearch.length < 3 || formData.cep) {
                setAddressSuggestions([]);
                return;
            }
            const { data, error } = await supabase.rpc('search_addresses', { p_search_term: debouncedAddressSearch });
            setAddressSuggestions(error ? [] : data || []);
        };
        getAddressSuggestions();
    }, [debouncedAddressSearch, formData.cep]);

    useEffect(() => {
        if (debouncedCep === initialCep.current || debouncedCep === lastProcessedCep.current) return;
        if (debouncedCep && debouncedCep.replace(/\D/g, '').length === 8) {
            lastProcessedCep.current = debouncedCep;
            triggerCepFetch(debouncedCep);
        }
    }, [debouncedCep, triggerCepFetch]);
    
    useEffect(() => {
        if (formData.street_name) {
            const formattedAddress = `${formData.street_name} (${formData.neighborhood || 'Bairro não informado'}) ${formData.city_name || ''}`.trim();
            setAddressSearch(formattedAddress);
        }
    }, [formData.street_name, formData.neighborhood, formData.city_name]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let maskedValue = value;
        if (name === 'cpf') maskedValue = maskCPF(value);
        if (name === 'cellphone') maskedValue = maskPhone(value);
        if (name === 'cep') maskedValue = maskCEP(value);
        setFormData(prev => ({ ...prev, [name]: maskedValue }));
    };
    
    const handleAddressSearchChange = (e) => {
        setAddressSearch(e.target.value);
        if (formData.cep) {
            setFormData(prev => ({ ...prev, cep: '', address_id: null, street_name: '', neighborhood: '', city_name: '', state_uf: '' }));
        }
    };

    const handleSelectContact = (suggestion) => {
        setFormData(prev => ({ ...prev, contact_customer_id: suggestion.id }));
        setContactSearch(suggestion.full_name);
        setContactSuggestions([]);
    };

    const handleClearContact = () => {
        setFormData(prev => ({ ...prev, contact_customer_id: null }));
        setContactSearch('');
    };

    const handleSelectAddress = (address) => {
        const newCep = maskCEP(address.cep || '');
        initialCep.current = newCep;
        setFormData(prev => ({
            ...prev,
            address_id: address.id, cep: newCep, street_name: address.street_name,
            neighborhood: address.neighborhood, city_name: address.city_name, state_uf: address.state_uf,
        }));
        setAddressSuggestions([]);
    };

    const handleSaveNewAddress = async (addressPayload) => {
        setIsSavingAddress(true);
        try {
            const { data: newAddress, error: rpcError } = await supabase.rpc('create_or_update_address', addressPayload);
            if (rpcError) throw rpcError;
            const { data: fullAddress, error: fetchError } = await supabase.from('addresses_with_customer_count').select('id, cep, street_name, neighborhood, city_name, state_uf').eq('id', newAddress.id).single();
            if (fetchError) throw fetchError;
            setFormData(prev => ({
                ...prev, address_id: fullAddress.id, cep: maskCEP(fullAddress.cep || ''),
                street_name: fullAddress.street_name, neighborhood: fullAddress.neighborhood,
                city_name: fullAddress.city_name, state_uf: fullAddress.state_uf,
            }));
            toast.success('Novo endereço cadastrado e selecionado!');
            setIsAddressModalOpen(false);
        } catch (error) {
            toast.error(handleSupabaseError(error));
        } finally {
            setIsSavingAddress(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.full_name) {
            toast.error('O Nome Completo é obrigatório.');
            return;
        }
        let finalAddressId = formData.address_id;
        if (formData.street_name && formData.city_name && formData.state_uf) {
            try {
                const { data: existingAddress } = await supabase.rpc('find_address_by_details', {
                    p_cep: formData.cep, p_street_name: formData.street_name,
                    p_city_name: formData.city_name, p_state_uf: formData.state_uf
                });
                if (existingAddress) {
                    finalAddressId = existingAddress.id;
                } else {
                    const { data: cityData } = await supabase.from('cities').select('id, states!inner(uf)').eq('name', formData.city_name).eq('states.uf', formData.state_uf.toUpperCase()).single();
                    if (!cityData) {
                        toast.error('Cidade/UF não encontrada.');
                        return;
                    }
                    const { data: addressData, error } = await supabase.rpc('create_or_update_address', {
                        p_address_id: null, p_cep: formData.cep, p_street_name: formData.street_name,
                        p_neighborhood: formData.neighborhood, p_city_id: cityData.id
                    });
                    if (error) throw error;
                    finalAddressId = addressData.id;
                }
            } catch (error) {
                toast.error(handleSupabaseError(error));
                return;
            }
        }
        const payload = {
            p_customer_id: customerToEdit?.id || null, p_full_name: formData.full_name,
            p_cpf: formData.cpf, p_cellphone: formData.cellphone, p_birth_date: formData.birth_date || null,
            p_contact_customer_id: formData.contact_customer_id, p_email: formData.email,
            p_address_id: finalAddressId, p_address_number: formData.address_number,
            p_address_complement: formData.address_complement,
        };
        onSave(payload);
    };

    return {
        formData, setFormData, contactSearch, setContactSearch, contactSuggestions, addressSearch,
        addressSuggestions, isAddressModalOpen, setIsAddressModalOpen, isSavingAddress, initialCepForNewAddress,
        isCepLoading, handleChange, handleAddressSearchChange, handleSelectContact, handleClearContact,
        handleSelectAddress, handleSaveNewAddress, handleSubmit,
    };
};
