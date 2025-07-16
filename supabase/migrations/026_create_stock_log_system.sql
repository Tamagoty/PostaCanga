-- Arquivo: supabase/migrations/026_create_stock_log_system.sql
-- Descrição: Cria um sistema de log para o estoque e uma função robusta para o gerir.

-- Etapa 1: Apagar a função antiga para evitar conflitos.
DROP FUNCTION IF EXISTS public.adjust_supply_stock;

-- Etapa 2: Criar a tabela para armazenar o histórico de movimentações de estoque.
CREATE TABLE public.supply_stock_log (
    id BIGSERIAL PRIMARY KEY,
    supply_id UUID NOT NULL REFERENCES public.office_supplies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    quantity_changed INT NOT NULL,
    new_stock_total INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.supply_stock_log IS 'Registra cada entrada e saída de material do estoque.';

-- Etapa 3: Criar a nova função RPC que ajusta o estoque e registra a movimentação.
CREATE OR REPLACE FUNCTION log_and_adjust_stock(
    p_supply_id UUID,
    p_quantity_change INT,
    p_reason TEXT
)
RETURNS INT -- Retorna o novo estoque.
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_stock INT;
BEGIN
    -- Atualiza o estoque na tabela principal
    UPDATE public.office_supplies
    SET stock = stock + p_quantity_change
    WHERE id = p_supply_id
    -- Garante que o estoque não fique negativo
    AND stock + p_quantity_change >= 0
    RETURNING stock INTO v_new_stock;

    -- Se a atualização falhou (ex: estoque ficaria negativo), lança um erro.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Falha ao atualizar o estoque. O resultado não pode ser negativo.';
    END IF;

    -- Insere o registro da movimentação na tabela de log.
    INSERT INTO public.supply_stock_log (supply_id, user_id, quantity_changed, new_stock_total, reason)
    VALUES (p_supply_id, auth.uid(), p_quantity_change, v_new_stock, p_reason);

    RETURN v_new_stock;
END;
$$;
