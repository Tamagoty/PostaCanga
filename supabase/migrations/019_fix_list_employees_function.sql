-- Arquivo: supabase/migrations/019_fix_list_employees_function.sql
-- Descrição: Corrige a função 'list_all_employees' para usar a função auxiliar 'get_my_role()'
--            e evitar o erro de recursão infinita.

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
AS $$
BEGIN
    -- CORREÇÃO: A verificação de permissão agora usa a função auxiliar,
    -- resolvendo o problema do loop infinito.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

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
