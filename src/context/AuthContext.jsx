// Arquivo: src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Pega a sessão inicial de forma segura
    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        setSession(currentSession);

        if (currentSession) {
          const { data: profile, error: profileError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profileError) throw profileError;
          setUserProfile(profile);
        }
      } catch (error) {
        console.error("Erro ao inicializar sessão no AuthContext:", error);
      } finally {
        // Garante que o estado de carregamento sempre termine,
        // permitindo que a aplicação seja renderizada (mesmo que para a tela de login).
        setLoading(false);
      }
    };
    
    getInitialSession();

    // 2. Ouve por mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          const { data: profile, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          
          if (error) {
            console.error("Erro ao buscar perfil na mudança de estado:", error);
            setUserProfile(null);
          } else {
            setUserProfile(profile);
          }
        } else {
          setUserProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    userProfile,
    isAdmin: userProfile?.role === 'admin',
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* O conteúdo da aplicação só é renderizado quando o carregamento inicial termina */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Alteração: Exportando o AuthProvider como padrão
export default AuthProvider;
