-- Arquivo: supabase/migrations/027_create_get_stock_log_function.sql
-- Descrição: Abordagem final e simplificada para buscar o histórico de estoque.

-- Etapa 1: Garantir que a função auxiliar 'get_my_role' está correta e segura.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT role FROM public.employees WHERE id = auth.uid());
END;
$$;


-- Etapa 2: Recriar a função para buscar o histórico.

-- CORREÇÃO: Adicionado o comando DROP FUNCTION para remover a versão antiga
-- antes de criar a nova, resolvendo o erro de "cannot change return type".
DROP FUNCTION IF EXISTS public.get_supply_stock_log(uuid, date);

CREATE OR REPLACE FUNCTION get_supply_stock_log(
    p_supply_id UUID,
    p_start_date DATE
)
RETURNS TABLE (
    id BIGINT,
    quantity_changed INT,
    new_stock_total INT,
    reason TEXT,
    created_at TIMESTAMPTZ,
    user_id UUID -- Retorna o ID do operador em vez do nome
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- A verificação de permissão continua a ser uma boa prática.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    RETURN QUERY
    SELECT
        l.id,
        l.quantity_changed,
        l.new_stock_total,
        l.reason,
        l.created_at,
        l.user_id
    FROM
        public.supply_stock_log l
    WHERE
        l.supply_id = p_supply_id AND l.created_at >= p_start_date
    ORDER BY
        l.created_at DESC;
END;
$$;
