-- Arquivo: supabase/migrations/010_create_set_customer_status_function.sql
-- Descrição: Função RPC recursiva para desativar um cliente e todos que dependem dele como contato.

CREATE OR REPLACE FUNCTION set_customer_status(
    p_customer_id UUID,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Utiliza uma CTE (Common Table Expression) recursiva para encontrar todos os clientes a serem atualizados.
    WITH RECURSIVE customer_hierarchy AS (
        -- Caso base: o cliente inicial
        SELECT id FROM public.customers WHERE id = p_customer_id
        
        UNION ALL
        
        -- Passo recursivo: encontra clientes que têm o cliente anterior como contato
        SELECT c.id
        FROM public.customers c
        INNER JOIN customer_hierarchy ch ON c.contact_customer_id = ch.id
    )
    -- Atualiza o status de todos os clientes encontrados na hierarquia.
    UPDATE public.customers
    SET is_active = p_is_active
    WHERE id IN (SELECT id FROM customer_hierarchy);
END;
$$;
