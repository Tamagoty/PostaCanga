-- Arquivo: supabase/migrations/028_final_employee_logic_fix.sql
-- Descrição: Aplica a mesma lógica de separação de consultas à página de funcionários.

-- Etapa 1: Apagar a função antiga e problemática.
DROP FUNCTION IF EXISTS get_all_employee_details();

-- Etapa 2: Criar uma nova função que busca APENAS os perfis da tabela 'employees'.
-- Isto evita o JOIN com a tabela 'auth.users' que estava a causar o erro de permissão.
CREATE OR REPLACE FUNCTION get_employee_profiles()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    registration_number TEXT,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.full_name,
        e.registration_number,
        e.role
    FROM public.employees e
    ORDER BY e.full_name;
END;
$$;
