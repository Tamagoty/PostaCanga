-- Arquivo: supabase/migrations/022_final_permission_fixes.sql
-- Descrição: Correção definitiva para as funções e políticas de segurança,
--            resolvendo o erro de recursão e tipo de resultado.

-- Etapa 1: Corrigir a função que busca a permissão do usuário.
-- Ao usar SECURITY DEFINER, garantimos que ela tem privilégios para ler a tabela 'employees'
-- sem ser bloqueada pelas regras de segurança que dependem dela.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta consulta agora irá contornar as políticas de RLS e evitar o loop.
  RETURN (SELECT role FROM public.employees WHERE id = auth.uid());
END;
$$;


-- Etapa 2: Corrigir a função que lista todos os funcionários.
-- Esta versão simplificada também usa SECURITY DEFINER para executar com privilégios elevados,
-- mas remove a complexidade de desligar e ligar o RLS manualmente.
CREATE OR REPLACE FUNCTION list_all_employees()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    registration_number TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verifica a permissão do usuário antes de qualquer outra coisa.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    -- A consulta principal que retorna os dados dos funcionários.
    -- Como a função inteira é SECURITY DEFINER, esta consulta terá permissão
    -- para ler as tabelas auth.users e public.employees.
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        e.full_name,
        e.registration_number,
        e.role,
        e.created_at
    FROM auth.users u
    JOIN public.employees e ON u.id = e.id
    ORDER BY e.full_name;
END;
$$;
