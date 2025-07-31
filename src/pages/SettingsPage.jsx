// Arquivo: src/pages/SettingsPage.jsx
// MELHORIA (v5): Removida a exibição da "chave" da lista de configurações para uma interface mais limpa.

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import styles from './SettingsPage.module.css';
import Button from '../components/Button';
import AppSettingForm from '../components/AppSettingForm';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import PromptModal from '../components/PromptModal';
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { handleSupabaseError } from '../utils/errorHandler';

const CORE_SETTINGS = ['agency_name', 'agency_dh', 'agency_mcu', 'agency_sto', 'agency_address'];

const SettingsPage = () => {
  const { theme, applyTheme, resetToDefault, defaultTheme } = useTheme();
  const [savedThemes, setSavedThemes] = useState([]);
  const [currentColors, setCurrentColors] = useState(theme);
  const [appSettings, setAppSettings] = useState([]);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [settingToEdit, setSettingToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isSettingConfirmOpen, setIsSettingConfirmOpen] = useState(false);
  const [settingToDelete, setSettingToDelete] = useState(null);
  const [isThemeConfirmOpen, setIsThemeConfirmOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data: themes, error: themesError } = await supabase.from('user_themes').select('*');
    if (themesError) toast.error(handleSupabaseError(themesError));
    else setSavedThemes(themes || []);

    const { data: settings, error: settingsError } = await supabase.from('app_settings').select('*').order('key');
    if (settingsError) toast.error(handleSupabaseError(settingsError));
    else setAppSettings(settings || []);
    
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
      p_key: formData.key, p_value: formData.value, p_description: formData.description, p_label: formData.label
    });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Configuração salva!'); setIsSettingModalOpen(false); fetchSettings(); }
    setLoading(false);
  };

  const startDeleteSetting = (setting) => {
    setSettingToDelete(setting);
    setIsSettingConfirmOpen(true);
  };

  const confirmDeleteSetting = async () => {
    if (!settingToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_app_setting', { p_key: settingToDelete.key });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Configuração apagada.'); fetchSettings(); }
    setIsDeleting(false);
    setIsSettingConfirmOpen(false);
    setSettingToDelete(null);
  };
  
  const confirmSaveTheme = async (themeName) => {
    if (savedThemes.length >= 3 && !savedThemes.find(t => t.theme_name === themeName)) {
      toast.error('Você pode salvar no máximo 3 temas. Apague um para salvar um novo.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('save_user_theme', { p_theme_name: themeName, p_theme_colors: currentColors });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success(`Tema "${themeName}" salvo com sucesso!`); fetchSettings(); }
    setIsPromptModalOpen(false);
    setLoading(false);
  };

  const startDeleteTheme = (theme) => {
    setThemeToDelete(theme);
    setIsThemeConfirmOpen(true);
  };

  const confirmDeleteTheme = async () => {
    if (!themeToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_user_theme', { p_theme_id: themeToDelete.id });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Tema apagado.'); fetchSettings(); }
    setIsDeleting(false);
    setIsThemeConfirmOpen(false);
    setThemeToDelete(null);
  };

  const handleColorChange = (e) => {
    const { name, value } = e.target;
    const newColors = { ...currentColors, [name]: value };
    setCurrentColors(newColors);
    applyTheme(newColors);
  };

  const colorInputs = Object.keys(defaultTheme).filter(key => !key.includes('hover'));

  return (
    <div className={styles.container}>
      <Modal isOpen={isSettingModalOpen} onClose={() => setIsSettingModalOpen(false)} title={settingToEdit ? 'Editar Configuração' : 'Nova Configuração'}>
        <AppSettingForm onSave={handleSaveSetting} onClose={() => setIsSettingModalOpen(false)} settingToEdit={settingToEdit} loading={loading} />
      </Modal>

      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSave={confirmSaveTheme}
        title="Salvar Tema"
        label="Digite um nome para o seu tema"
        placeholder="Ex: Meu Tema Azul"
        loading={loading}
      />

      <ConfirmationModal
        isOpen={isSettingConfirmOpen}
        onClose={() => setIsSettingConfirmOpen(false)}
        onConfirm={confirmDeleteSetting}
        title="Confirmar Exclusão" loading={isDeleting}
      >
        <p>Tem certeza que deseja apagar a configuração <strong>{settingToDelete?.label || settingToDelete?.key}</strong>?</p>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={isThemeConfirmOpen}
        onClose={() => setIsThemeConfirmOpen(false)}
        onConfirm={confirmDeleteTheme}
        title="Confirmar Exclusão" loading={isDeleting}
      >
        <p>Tem certeza que deseja apagar o tema <strong>{themeToDelete?.theme_name}</strong>?</p>
      </ConfirmationModal>

      <h1>Configurações</h1>
      
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
            <h2>Configurações da Agência</h2>
            <Button onClick={() => handleOpenSettingModal()}><FaPlus /> Nova</Button>
        </div>
        <div className={styles.settingsList}>
            {appSettings.map(setting => {
              const isCore = CORE_SETTINGS.includes(setting.key);
              return (
                <div key={setting.key} className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                        <strong>{setting.label || setting.key}</strong>
                        <span>{setting.value}</span>
                        <em>{setting.description}</em>
                    </div>
                    <div className={styles.settingActions}>
                        <button onClick={() => handleOpenSettingModal(setting)} title="Editar"><FaEdit /></button>
                        <button 
                          onClick={() => startDeleteSetting(setting)} 
                          className={styles.deleteButton}
                          disabled={isCore}
                          title={isCore ? "Esta configuração não pode ser apagada" : "Apagar configuração"}
                        >
                          <FaTrash />
                        </button>
                    </div>
                </div>
              )
            })}
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
          <Button onClick={() => setIsPromptModalOpen(true)}>Salvar Tema Atual</Button>
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
                <button className={styles.deleteButton} onClick={() => startDeleteTheme(st)}>
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
