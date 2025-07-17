// Arquivo: src/pages/SettingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SettingsPage.module.css';
import Button from '../components/Button';
import Input from '../components/Input'; // Importando o Input
import { FaTrash, FaSave } from 'react-icons/fa';

const SettingsPage = () => {
  const { theme, applyTheme, resetToDefault, defaultTheme } = useTheme();
  const [savedThemes, setSavedThemes] = useState([]);
  const [currentColors, setCurrentColors] = useState(theme);
  // Novos estados para as configurações gerais
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(false);

  // Função unificada para buscar todas as configurações
  const fetchSettings = useCallback(async () => {
    // Busca os temas do usuário
    const { data: themes } = await supabase.from('user_themes').select('*');
    setSavedThemes(themes || []);
    
    // Busca o nome da agência
    const { data: agency } = await supabase.from('app_settings').select('value').eq('key', 'agency_name').single();
    if (agency) setAgencyName(agency.value);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setCurrentColors(theme);
  }, [theme]);

  const handleColorChange = (e) => {
    const { name, value } = e.target;
    const newColors = { ...currentColors, [name]: value };
    setCurrentColors(newColors);
    applyTheme(newColors);
  };

  const handleSaveTheme = async () => {
    const themeName = prompt('Digite um nome para o seu tema (ex: Meu Tema Azul):');
    if (!themeName) return;
    if (savedThemes.length >= 3 && !savedThemes.find(t => t.theme_name === themeName)) {
      toast.error('Você pode salvar no máximo 3 temas. Apague um para salvar um novo.');
      return;
    }
    const { error } = await supabase.rpc('save_user_theme', { p_theme_name: themeName, p_theme_colors: currentColors });
    if (error) toast.error('Erro ao salvar o tema.');
    else { toast.success(`Tema "${themeName}" salvo com sucesso!`); fetchSettings(); }
  };

  const handleDeleteTheme = async (themeId) => {
    if (!window.confirm('Tem certeza que deseja apagar este tema?')) return;
    const { error } = await supabase.rpc('delete_user_theme', { p_theme_id: themeId });
    if (error) toast.error('Erro ao apagar o tema.');
    else { toast.success('Tema apagado.'); fetchSettings(); }
  };

  // Nova função para salvar o nome da agência
  const handleSaveAgencyName = async () => {
    setLoading(true);
    const { error } = await supabase.rpc('update_app_setting', { p_key: 'agency_name', p_value: agencyName });
    if (error) toast.error('Erro ao salvar nome da agência.');
    else toast.success('Nome da agência salvo!');
    setLoading(false);
  };

  const colorInputs = Object.keys(defaultTheme).filter(key => !key.includes('hover'));

  return (
    <div className={styles.container}>
      <h1>Configurações</h1>
      
      {/* Nova seção para Configurações Gerais */}
      <div className={styles.section}>
        <h2>Configurações Gerais</h2>
        <div className={styles.generalSettings}>
          <Input id="agencyName" label="Nome da Agência" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
          <Button onClick={handleSaveAgencyName} loading={loading}><FaSave /> Salvar Nome</Button>
        </div>
      </div>

      {/* Seção de Aparência do Tema (código original preservado) */}
      <div className={styles.section}>
        <h2>Editor de Tema</h2>
        <div className={styles.colorGrid}>
          {colorInputs.map(key => (
            <div key={key} className={styles.colorInputGroup}>
              <label htmlFor={key}>{key.replace('--', '').replace(/-/g, ' ')}</label>
              <input type="color" id={key} name={key} value={currentColors[key] || '#000000'} onChange={handleColorChange} />
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <Button onClick={handleSaveTheme}>Salvar Tema Atual</Button>
          <Button onClick={resetToDefault} variant="secondary">Restaurar Padrão</Button>
        </div>
      </div>

      {/* Seção de Temas Salvos (código original preservado) */}
      <div className={styles.section}>
        <h2>Meus Temas Salvos</h2>
        <div className={styles.savedThemesGrid}>
          {savedThemes.length > 0 ? savedThemes.map(st => (
            <div key={st.id} className={styles.themeCard}>
              <span className={styles.themeName}>{st.theme_name}</span>
              <div className={styles.themeActions}>
                <Button onClick={() => applyTheme(st.theme_colors)}>Aplicar</Button>
                <button className={styles.deleteButton} onClick={() => handleDeleteTheme(st.id)}>
                  <FaTrash />
                </button>
              </div>
            </div>
          )) : <p>Nenhum tema salvo.</p>}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
