// Arquivo: src/components/UpcomingBirthdays.jsx
import React, { useState, useMemo } from 'react';
import styles from './UpcomingBirthdays.module.css';
import { FaBirthdayCake, FaGift } from 'react-icons/fa';
import Button from './Button';

const UpcomingBirthdays = ({ birthdays }) => {
  const [filter, setFilter] = useState('7days'); // '7days' ou '30days'

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Zera a hora para comparações de data

  const filteredBirthdays = useMemo(() => {
    if (!birthdays) return [];

    const dayLimit = filter === '7days' ? 7 : 30;

    return birthdays
      .map(customer => {
        const birthDate = new Date(customer.birth_date);
        birthDate.setFullYear(today.getFullYear()); // Traz o aniversário para o ano corrente
        
        // Se o aniversário já passou este ano, verifica no próximo ano
        if (birthDate < today) {
          birthDate.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = birthDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...customer, daysUntil: diffDays };
      })
      .filter(customer => customer.daysUntil >= 0 && customer.daysUntil < dayLimit)
      .sort((a, b) => a.daysUntil - b.daysUntil);
      
  }, [birthdays, filter, today]);

  const getDaySuffix = (day) => {
    if (day === 1) return 'dia';
    return 'dias';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Aniversários Próximos</h2>
        <div className={styles.filters}>
          <Button
            variant={filter === '7days' ? 'primary' : 'secondary'}
            onClick={() => setFilter('7days')}
          >
            Próximos 7 dias
          </Button>
          <Button
            variant={filter === '30days' ? 'primary' : 'secondary'}
            onClick={() => setFilter('30days')}
          >
            Próximos 30 dias
          </Button>
        </div>
      </div>
      
      {filteredBirthdays.length > 0 ? (
        <ul className={styles.list}>
          {filteredBirthdays.map(customer => (
            <li key={customer.id} className={styles.listItem}>
              <div className={styles.iconWrapper}>
                {customer.daysUntil === 0 ? <FaGift className={styles.todayIcon} /> : <FaBirthdayCake />}
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{customer.full_name}</span>
                <span className={styles.date}>
                  {new Date(customer.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </span>
              </div>
              <span className={`${styles.countdown} ${customer.daysUntil === 0 ? styles.todayText : ''}`}>
                {customer.daysUntil === 0 ? 'Hoje!' : `em ${customer.daysUntil} ${getDaySuffix(customer.daysUntil)}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyMessage}>Nenhum aniversário no período selecionado.</p>
      )}
    </div>
  );
};

export default UpcomingBirthdays;
