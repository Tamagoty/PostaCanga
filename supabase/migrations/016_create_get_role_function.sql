-- Arquivo: supabase/migrations/016_create_get_role_function.sql
-- Descrição: Cria uma função auxiliar para buscar a permissão (role) do usuário atual.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
-- SECURITY INVOKER é o padrão, mas SECURITY DEFINER pode ser usado se a função precisar de mais privilégios.
-- Para este caso simples, INVOKER é mais seguro.
SECURITY INVOKER
AS $$
BEGIN
  -- Retorna a permissão do usuário autenticado a partir da tabela de funcionários.
  RETURN (SELECT role FROM public.employees WHERE id = auth.uid());
END;
$$;
