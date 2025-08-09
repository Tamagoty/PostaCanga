// path: src/components/AddressCustomersModal.jsx
import React, { useState, useMemo } from 'react';
import { FaUser, FaSort, FaSortUp, FaSortDown, FaCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import styles from './AddressCustomersModal.module.css';
import EmptyState from './EmptyState';
import Spinner from './Spinner';
import { formatCEP } from '../utils/masks'; // Importa a nova função

const AddressCustomersModal = ({ customers, loading, address }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });

  const sortedCustomers = useMemo(() => {
    let sortableItems = [...customers];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'address_number') {
            const numA = parseInt(a[sortConfig.key], 10) || 0;
            const numB = parseInt(b[sortConfig.key], 10) || 0;
            if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        } else {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
      });
    }
    return sortableItems;
  }, [customers, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return <FaSort className={styles.sortIcon} />;
    if (sortConfig.direction === 'asc') return <FaSortUp className={styles.sortIconActive} />;
    return <FaSortDown className={styles.sortIconActive} />;
  };

  if (loading) {
    return <div className={styles.centered}><Spinner /></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4>Moradores do Endereço</h4>
        <p className={styles.addressLine}>{address?.street_name}</p>
        <p className={styles.addressDetails}>
          {address?.neighborhood && `${address.neighborhood}, `}
          {address?.city_name} - {address?.state_uf}
          {address?.cep && ` | CEP: ${formatCEP(address.cep)}`}
        </p>
      </div>

      {customers.length > 0 ? (
        <table className={styles.customerTable}>
          <thead>
            <tr>
              <th onClick={() => requestSort('full_name')}>
                Nome {getSortIcon('full_name')}
              </th>
              <th onClick={() => requestSort('address_number')}>
                Nº {getSortIcon('address_number')}
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.map(customer => (
              <tr key={customer.id}>
                <td>
                    <Link to={`/customers/${customer.id}`} className={styles.customerLink} target="_blank" rel="noopener noreferrer">
                        {customer.full_name}
                    </Link>
                    {customer.address_complement && <span className={styles.complement}>({customer.address_complement})</span>}
                </td>
                <td>{customer.address_number || '-'}</td>
                <td>
                  <span className={customer.is_active ? styles.active : styles.inactive}>
                    <FaCircle /> {customer.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={styles.centered}>
          <EmptyState
            icon={FaUser}
            title="Nenhum Morador"
            message="Não há clientes cadastrados para este endereço."
          />
        </div>
      )}
    </div>
  );
};

export default AddressCustomersModal;
