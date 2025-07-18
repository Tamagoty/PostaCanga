// Arquivo: src/pages/LoginPage.jsx
// MELHORIA (v2): Implementado o `handleSupabaseError`.

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import Input from '../components/Input';
import Button from '../components/Button';
import styles from './LoginPage.module.css';
import { handleSupabaseError } from '../utils/errorHandler';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      toast.error(handleSupabaseError(error));
    } else {
      toast.success('Login realizado com sucesso!');
    }
    setLoading(false);
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <h2 className={styles.title}>Acessar o Sistema</h2>
        <p className={styles.subtitle}>Use suas credenciais de funcionário.</p>
        
        <Input
          id="email"
          label="E-mail"
          type="email"
          placeholder="seu.email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={FaEnvelope}
          required
        />
        
        <Input
          id="password"
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={FaLock}
          required
        />
        
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
};

export default LoginPage;
