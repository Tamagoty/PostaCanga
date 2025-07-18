-- Arquivo: supabase/migrations/059_create_count_functions.sql
-- Descrição: Cria as funções para contar o total de itens nas tabelas de 
--            materiais de expediente e links, para a paginação.

-- Função para contar materiais de expediente
CREATE OR REPLACE FUNCTION count_supplies()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.office_supplies;
    RETURN v_count;
END;
$$;

-- Função para contar links úteis
CREATE OR REPLACE FUNCTION count_links()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.system_links;
    RETURN v_count;
END;
$$;