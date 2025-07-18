// Arquivo: src/components/Notifications.jsx
// MELHORIA (v3): Corrigida a lógica para dispensar as notificações.
// O sino agora só desaparece DEPOIS que o painel é fechado.

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Notifications.module.css';
import { FaBell, FaBoxOpen, FaTasks, FaExclamationTriangle } from 'react-icons/fa';

const Notifications = ({ notifications, loading, onDismiss }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const notificationCount = notifications?.length || 0;

  const handleBellClick = () => {
    // Ao clicar no sino, apenas abrimos ou fechamos o painel.
    setIsOpen(prev => !prev);
  };

  const iconMap = {
    stock: <FaBoxOpen />,
    task: <FaTasks />,
    object: <FaExclamationTriangle />,
  };

  const handleNotificationClick = (link) => {
    setIsOpen(false);
    onDismiss(); // Dispensa o sino ANTES de navegar
    navigate(link);
  };

  // Fecha o dropdown se clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (isOpen) {
          onDismiss(); // Dispensa o sino ao fechar clicando fora
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onDismiss]); // Adicionado onDismiss às dependências

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button className={styles.bellButton} onClick={handleBellClick}>
        <FaBell />
        {notificationCount > 0 && <span className={styles.badge}>{notificationCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notificações</h3>
          </div>
          <div className={styles.list}>
            {loading ? (
              <div className={styles.item}>Carregando...</div>
            ) : notificationCount > 0 ? (
              notifications.map((notif) => (
                <div key={notif.unique_id} className={styles.item} onClick={() => handleNotificationClick(notif.link)}>
                  <div className={`${styles.icon} ${styles[notif.type]}`}>
                    {iconMap[notif.type]}
                  </div>
                  <div className={styles.message}>{notif.message}</div>
                </div>
              ))
            ) : (
              <div className={styles.item}>Nenhuma notificação no momento.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
