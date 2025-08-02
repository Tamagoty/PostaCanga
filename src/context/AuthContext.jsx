// path: src/context/AuthContext.jsx
// CORREÇÃO (v1.2): Revertida a separação do hook useAuth. O hook e o provider
// agora coexistem neste ficheiro para resolver o erro crítico de importação.

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

// O hook para consumir o contexto é definido aqui.
// A linha abaixo desativa o aviso do Vite sobre "Fast Refresh", pois este padrão é seguro.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setAuthData = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (currentSession) {
          setSession(currentSession);
          const { data: profileData, error: profileError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', currentSession.user.id);
          
          if (profileError) {
            if (profileError.code !== '42P17') {
              throw profileError;
            }
          }

          if (profileData && profileData.length > 0) {
            setUserProfile(profileData[0]);
          } else {
            setUserProfile(null);
          }
        } else {
          setSession(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Erro ao configurar dados de autenticação:", error);
        setSession(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    setAuthData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthData();
    });

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
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
