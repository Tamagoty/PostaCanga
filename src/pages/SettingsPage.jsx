// Arquivo: src/pages/SettingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import styles from './SettingsPage.module.css';
import Button from '../components/Button';
import Input from '../components/Input'; // Importando o Input
import AppSettingForm from '../components/AppSettingForm';
import Modal from '../components/Modal';
import { FaTrash, FaEdit, FaPlus, FaSave } from 'react-icons/fa';

const SettingsPage = () => {
  const { theme, applyTheme, resetToDefault, defaultTheme } = useTheme();
  const [savedThemes, setSavedThemes] = useState([]);
  const [currentColors, setCurrentColors] = useState(theme);
  const [appSettings, setAppSettings] = useState([]);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false); // Modal para temas
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false); // Modal para configurações
  const [settingToEdit, setSettingToEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data: themes } = await supabase.from('user_themes').select('*');
    setSavedThemes(themes || []);
    const { data: settings } = await supabase.from('app_settings').select('*').order('key');
    setAppSettings(settings || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { setCurrentColors(theme); }, [theme]);

  const handleOpenSettingModal = (setting = null) => {
    setSettingToEdit(setting);
    setIsSettingModalOpen(true);
  };

  const handleSaveSetting = async (formData) => {
    setLoading(true);
    const { error } = await supabase.rpc('create_or_update_app_setting', {
      p_key: formData.key, p_value: formData.value, p_description: formData.description
    });
    if (error) toast.error('Erro ao salvar configuração.');
    else { toast.success('Configuração salva!'); setIsSettingModalOpen(false); fetchSettings(); }
    setLoading(false);
  };

  const handleDeleteSetting = async (key) => {
    if (!window.confirm(`Tem certeza que deseja apagar a configuração "${key}"?`)) return;
    const { error } = await supabase.rpc('delete_app_setting', { p_key: key });
    if (error) toast.error(`Erro ao apagar: ${error.message}`);
    else { toast.success('Configuração apagada.'); fetchSettings(); }
  };

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

  const colorInputs = Object.keys(defaultTheme).filter(key => !key.includes('hover'));

  return (
    <div className={styles.container}>
      <Modal isOpen={isSettingModalOpen} onClose={() => setIsSettingModalOpen(false)} title={settingToEdit ? 'Editar Configuração' : 'Nova Configuração'}>
        <AppSettingForm onSave={handleSaveSetting} onClose={() => setIsSettingModalOpen(false)} settingToEdit={settingToEdit} loading={loading} />
      </Modal>

      <h1>Configurações</h1>
      
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
            <h2>Configurações da Agência</h2>
            <Button onClick={() => handleOpenSettingModal()}><FaPlus /> Nova</Button>
        </div>
        <div className={styles.settingsList}>
            {appSettings.map(setting => (
                <div key={setting.key} className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <strong>{setting.key}</strong>
                        <span>{setting.value}</span>
                        <em>{setting.description}</em>
                    </div>
                    <div className={styles.settingActions}>
                        <button onClick={() => handleOpenSettingModal(setting)}><FaEdit /></button>
                        <button onClick={() => handleDeleteSetting(setting.key)} className={styles.deleteButton}><FaTrash /></button>
                    </div>
                </div>
            ))}
        </div>
      </div>

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
