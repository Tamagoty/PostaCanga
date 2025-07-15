-- Arquivo: supabase/migrations/011_create_supplies_functions.sql
-- Descrição: Funções RPC para gerenciar o estoque de material de expediente.

-- Função para criar ou atualizar um item de material de expediente.
CREATE OR REPLACE FUNCTION create_or_update_supply(
    p_supply_id UUID, -- Forneça um ID para atualizar, ou NULL para criar.
    p_name TEXT,
    p_description TEXT,
    p_initial_stock INT DEFAULT 0
)
RETURNS office_supplies
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_supply office_supplies;
BEGIN
    IF p_supply_id IS NOT NULL THEN
        -- Atualiza um item existente. O estoque não é alterado aqui.
        UPDATE public.office_supplies
        SET
            name = p_name,
            description = p_description,
            updated_at = NOW()
        WHERE id = p_supply_id
        RETURNING * INTO result_supply;
    ELSE
        -- Insere um novo item.
        INSERT INTO public.office_supplies (name, description, stock)
        VALUES (p_name, p_description, p_initial_stock)
        RETURNING * INTO result_supply;
    END IF;

    RETURN result_supply;
END;
$$;

-- Função para ajustar o estoque de um item (adicionar ou remover).
CREATE OR REPLACE FUNCTION adjust_supply_stock(
    p_supply_id UUID,
    p_quantity_change INT -- Use um número positivo para adicionar, negativo para remover.
)
RETURNS INT -- Retorna o novo estoque.
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_stock INT;
BEGIN
    UPDATE public.office_supplies
    SET stock = stock + p_quantity_change
    WHERE id = p_supply_id
    -- Garante que o estoque não fique negativo.
    AND stock + p_quantity_change >= 0
    RETURNING stock INTO new_stock;

    -- Se a atualização falhou (ex: estoque ficaria negativo), lança um erro.
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Falha ao atualizar o estoque. O resultado não pode ser negativo.';
    END IF;

    RETURN new_stock;
END;
$$;
