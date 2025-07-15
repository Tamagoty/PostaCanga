-- Arquivo: supabase/migrations/020_fix_get_role_security.sql
-- Descrição: Altera a função 'get_my_role' para usar SECURITY DEFINER,
--            resolvendo o erro de recursão infinita de forma definitiva.

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
-- CORREÇÃO: Alterado de SECURITY INVOKER (padrão) para SECURITY DEFINER.
-- Isto permite que a função leia a permissão do usuário sem ser bloqueada
-- pelas próprias regras de segurança que dependem desta função.
SECURITY DEFINER
AS $$
BEGIN
  -- A lógica interna da função permanece a mesma.
  RETURN (SELECT role FROM public.employees WHERE id = auth.uid());
END;
$$;
