-- Arquivo: supabase/migrations/021_fix_list_employees_security.sql
-- Descrição: Altera a função 'list_all_employees' para usar SECURITY DEFINER,
--            resolvendo o erro de permissão de forma definitiva.

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
-- CORREÇÃO: Adicionado SECURITY DEFINER para que a função seja executada
-- com privilégios de administrador, contornando as políticas de RLS.
SECURITY DEFINER
AS $$
BEGIN
    -- A verificação de permissão continua sendo uma boa prática.
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
