-- Arquivo: supabase/migrations/015_create_employee_management_functions.sql
-- Descrição: Funções RPC para gerenciar funcionários.

-- Função para listar todos os funcionários (apenas para admins).
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
    -- Verifica se o usuário que chama a função é um administrador.
    IF (SELECT e.role FROM public.employees e WHERE e.id = auth.uid()) <> 'admin' THEN
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


-- ATENÇÃO: As funções abaixo para criar e deletar usuários manipulam a autenticação
-- e requerem privilégios elevados. O ideal é que sejam implementadas como
-- Supabase Edge Functions para máxima segurança. Estas são implementações
-- simplificadas e devem ser usadas com cautela.

-- Função para deletar um funcionário (auth e public).
CREATE OR REPLACE FUNCTION delete_employee(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT role FROM public.employees WHERE id = auth.uid()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    -- Deleta o usuário da tabela de autenticação. O 'ON DELETE CASCADE' na tabela 'employees'
    -- irá remover o registro correspondente automaticamente.
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
