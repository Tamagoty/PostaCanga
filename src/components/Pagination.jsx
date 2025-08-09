// path: src/components/Pagination.jsx
import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import styles from './Pagination.module.css';
import Button from './Button';
import Input from './Input';

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange }) => {
  const [goToPage, setGoToPage] = useState(currentPage + 1);

  useEffect(() => {
    setGoToPage(currentPage + 1);
  }, [currentPage]);

  const handleGoToPage = (e) => {
    e.preventDefault();
    const pageNumber = parseInt(goToPage, 10);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber - 1);
    }
  };

  const handleItemsChange = (e) => {
    onItemsPerPageChange(Number(e.target.value));
  };

  if (totalPages <= 1) {
    return null; // Não exibe a paginação se houver apenas uma página
  }

  return (
    <div className={styles.paginationContainer}>
      <div className={styles.itemsPerPage}>
        <label htmlFor="itemsPerPage">Itens por página:</label>
        <select id="itemsPerPage" value={itemsPerPage} onChange={handleItemsChange} className={styles.select}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div className={styles.navigation}>
        <Button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 0}>
          <FaArrowLeft /> Anterior
        </Button>
        
        <form onSubmit={handleGoToPage} className={styles.pageInputForm}>
          <Input
            type="number"
            min="1"
            max={totalPages}
            value={goToPage}
            onChange={(e) => setGoToPage(e.target.value)}
            className={styles.pageInput}
          />
          <span className={styles.totalPages}>de {totalPages}</span>
        </form>

        <Button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage + 1 >= totalPages}>
          Próxima <FaArrowRight />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
