-- Arquivo: supabase/migrations/058_create_address_count_function.sql
-- Descrição: Cria a função para contar o total de endereços para a paginação.

CREATE OR REPLACE FUNCTION count_addresses()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.addresses;
    RETURN v_count;
END;
$$;