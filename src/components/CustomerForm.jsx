// path: src/components/CustomerForm.jsx
import React from 'react';
import { useCustomerForm } from '../hooks/useCustomerForm';
import styles from './CustomerForm.module.css';
import Button from './Button';
import Modal from './Modal';
import AddressForm from './AddressForm';
import PersonalDataFieldset from './PersonalDataFieldset';
import ResponsibleContactFieldset from './ResponsibleContactFieldset';
import AddressFieldset from './AddressFieldset';

const CustomerForm = ({ onSave, onClose, customerToEdit, loading }) => {
    const {
        formData, setFormData, contactSearch, setContactSearch, contactSuggestions, addressSearch,
        addressSuggestions, isAddressModalOpen, setIsAddressModalOpen, isSavingAddress, initialCepForNewAddress,
        isCepLoading, handleChange, handleAddressSearchChange, handleSelectContact, handleClearContact,
        handleSelectAddress, handleSaveNewAddress, handleSubmit,
    } = useCustomerForm({ customerToEdit, onSave });

    return (
        <>
            <Modal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} title="Cadastrar Novo Endereço">
                <AddressForm
                    initialCep={initialCepForNewAddress}
                    onSave={handleSaveNewAddress}
                    onClose={() => setIsAddressModalOpen(false)}
                    loading={isSavingAddress}
                />
            </Modal>

            <form onSubmit={handleSubmit} className={styles.form}>
                <PersonalDataFieldset
                    formData={formData}
                    handleChange={handleChange}
                    setFormData={setFormData}
                />

                {!formData.cellphone && (
                    <ResponsibleContactFieldset
                        contactSearch={contactSearch}
                        setContactSearch={setContactSearch}
                        contactSuggestions={contactSuggestions}
                        onSelectContact={handleSelectContact}
                        onClearContact={handleClearContact}
                        contactCustomerId={formData.contact_customer_id}
                    />
                )}

                <AddressFieldset
                    formData={formData}
                    handleChange={handleChange}
                    setFormData={setFormData}
                    isCepLoading={isCepLoading}
                    addressSearch={addressSearch}
                    onAddressSearchChange={handleAddressSearchChange}
                    addressSuggestions={addressSuggestions}
                    onSelectAddress={handleSelectAddress}
                />

                <div className={styles.formActions}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" loading={loading || isCepLoading} disabled={loading || isCepLoading}>
                        {loading ? 'Salvando...' : 'Salvar Cliente'}
                    </Button>
                </div>
            </form>
        </>
    );
};

export default CustomerForm;
