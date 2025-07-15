-- Arquivo: supabase/migrations/023_rework_employee_logic.sql
-- Descrição: Recria a lógica de busca de funcionários para resolver o erro de permissão.

-- Etapa 1: Apagar a função antiga para garantir que não haja conflitos.
DROP FUNCTION IF EXISTS list_all_employees();

-- Etapa 2: Criar uma nova função, mais simples e robusta.
-- Esta função busca apenas os dados da tabela 'employees'. O e-mail será buscado
-- separadamente no frontend, se necessário, para isolar o problema.
CREATE OR REPLACE FUNCTION get_all_employees()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    registration_number TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- A verificação de permissão continua a ser crucial.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    -- A consulta agora é mais simples, buscando apenas da tabela 'employees'.
    RETURN QUERY
    SELECT
        e.id,
        e.full_name,
        e.registration_number,
        e.role,
        e.created_at
    FROM public.employees e
    ORDER BY e.full_name;
END;
$$;
