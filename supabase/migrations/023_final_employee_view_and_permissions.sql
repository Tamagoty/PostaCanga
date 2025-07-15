-- Arquivo: supabase/migrations/023_final_employee_view_and_permissions.sql
-- Descrição: Abordagem definitiva usando uma função SECURITY DEFINER para listar funcionários.

-- Etapa 1: Apagar a VIEW e as funções antigas para começar do zero.
DROP VIEW IF EXISTS public.employee_details;
DROP FUNCTION IF EXISTS list_all_employees();
DROP FUNCTION IF EXISTS get_all_employees();

-- Etapa 2: Garantir que a função auxiliar 'get_my_role' está correta e segura.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role FROM public.employees WHERE id = auth.uid());
END;
$$;

-- Etapa 3: Criar a função RPC definitiva para buscar os detalhes dos funcionários.
-- Usar SECURITY DEFINER permite que esta função aceda à tabela 'auth.users'
-- com privilégios elevados, resolvendo o erro de "permission denied".
CREATE OR REPLACE FUNCTION get_all_employee_details()
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
    -- A verificação de permissão continua a ser crucial.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    -- A consulta principal que retorna os dados dos funcionários.
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        e.full_name,
        e.registration_number,
        e.role,
        e.created_at
    FROM
        auth.users u
    JOIN
        public.employees e ON u.id = e.id
    ORDER BY
        e.full_name;
END;
$$;


-- Etapa 4: Garantir que a função de apagar funcionário está correta.
CREATE OR REPLACE FUNCTION delete_employee(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
