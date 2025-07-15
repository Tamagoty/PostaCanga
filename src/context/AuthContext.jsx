// Arquivo: src/context/AuthContext.jsx (Versão Final e Corrigida)
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função para verificar a sessão e buscar o perfil do usuário
    const setAuthData = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (currentSession) {
          setSession(currentSession);
          // CORREÇÃO: A chamada a .single() pode falhar se o perfil ainda não foi criado.
          // Removemos .single() e verificamos se os dados retornados têm algum registro.
          const { data: profileData, error: profileError } = await supabase
            .from('employees')
            .select('*')
            .eq('id', currentSession.user.id);
          
          if (profileError) {
            // Se o erro for de RLS (recursão), não o tratamos como um erro fatal.
            if (profileError.code !== '42P17') {
              throw profileError;
            }
          }

          // Se um perfil foi encontrado (profileData não é nulo e tem pelo menos um item), define o perfil.
          if (profileData && profileData.length > 0) {
            setUserProfile(profileData[0]);
          } else {
            // Se nenhum perfil foi encontrado, define como nulo.
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
