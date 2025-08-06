-- path: supabase/migrations/0014_customer_suggestions.sql
-- =============================================================================
-- || SCRIPT DE NOVA FUNCIONALIDADE - SUGESTÃO DE CLIENTES NA LISTAGEM        ||
-- =============================================================================
-- DESCRIÇÃO: Adiciona funções para sugerir e associar clientes a objetos
--            diretamente da página de listagem de objetos.
-- VERSÃO: 1.2 - Corrigido o tipo de retorno da coluna full_name.

--------------------------------------------------------------------------------
-- FUNÇÕES RPC
--------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS suggest_customer_links(TEXT);
-- Sugere clientes com base na similaridade do nome e retorna também o seu endereço.
CREATE OR REPLACE FUNCTION suggest_customer_links(p_search_term TEXT)
RETURNS TABLE(id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        -- [CORREÇÃO] O resultado é explicitamente convertido para TEXT para evitar erros de tipo.
        c.full_name::TEXT,
        COALESCE(a.street_name || ', ' || a.neighborhood, a.street_name, 'Endereço não cadastrado')::TEXT AS address_info
    FROM
        public.customers c
    LEFT JOIN
        public.addresses a ON c.address_id = a.id
    WHERE
        -- A função similarity vem da extensão pg_trgm.
        -- Um valor de 0.2 é um bom ponto de partida para nomes abreviados.
        similarity(f_unaccent(c.full_name), f_unaccent(p_search_term)) > 0.2
    ORDER BY
        similarity(f_unaccent(c.full_name), f_unaccent(p_search_term)) DESC
    LIMIT 5; -- Limita a 5 sugestões para não poluir a interface
END;
$$;


DROP FUNCTION IF EXISTS link_object_to_customer(INT, UUID);
-- Associa um objeto a um cliente existente.
CREATE OR REPLACE FUNCTION link_object_to_customer(
    p_control_number INT,
    p_customer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.objects
    SET
        customer_id = p_customer_id,
        -- Opcional: Atualiza o nome do destinatário para o nome completo do cliente
        recipient_name = (SELECT full_name FROM public.customers WHERE id = p_customer_id)
    WHERE
        control_number = p_control_number;
END;
$$;



DROP FUNCTION IF EXISTS search_contacts(TEXT);
CREATE OR REPLACE FUNCTION search_contacts(p_search_term TEXT)
RETURNS TABLE (id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        -- [CORREÇÃO] Adicionado casting explícito para TEXT.
        c.full_name::TEXT,
        COALESCE(a.street_name || ', ' || c.address_number || ' - ' || a.neighborhood, 'Endereço não informado') AS address_info
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    WHERE c.is_active = TRUE
      AND c.cellphone IS NOT NULL
      AND public.f_unaccent(c.full_name) ILIKE '%' || public.f_unaccent(p_search_term) || '%'
    ORDER BY c.full_name
    LIMIT 20;
END;
$$;



-- ARQUIVO: 0009_fix_data_fetching.sql
-- DESCRIÇÃO: Corrige as funções de busca de objetos e sugestão de clientes
--            para garantir que os tipos de dados retornados correspondam
--            exatamente ao que a aplicação espera, resolvendo os bugs de
--            listagem e busca.

-- CORREÇÃO 1: Função de paginação de objetos
DROP FUNCTION IF EXISTS get_paginated_objects(TEXT, BOOLEAN, TEXT, BOOLEAN, INT, INT);
CREATE OR REPLACE FUNCTION get_paginated_objects(
    p_search_term TEXT,
    p_show_archived BOOLEAN,
    p_sort_key TEXT,
    p_sort_direction_asc BOOLEAN,
    p_page_size INT,
    p_page_offset INT
)
RETURNS TABLE (
    -- Define explicitamente todas as colunas que a aplicação espera
    control_number INT,
    recipient_name TEXT,
    customer_id UUID,
    delivery_address_id UUID,
    tracking_code TEXT,
    object_type TEXT,
    arrival_date DATE,
    storage_deadline DATE,
    status TEXT,
    is_archived BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    delivery_street_name TEXT,
    delivery_address_number TEXT,
    delivery_neighborhood TEXT,
    delivery_city_name TEXT,
    delivery_state_uf CHAR(2),
    delivery_cep TEXT,
    addresses JSONB,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_objects AS (
        SELECT
            o.*,
            COUNT(*) OVER() AS total_count
        FROM
            public.objects o
        WHERE
            o.is_archived = p_show_archived AND
            (
                p_search_term IS NULL OR p_search_term = '' OR
                public.f_unaccent(o.recipient_name) ILIKE '%' || public.f_unaccent(p_search_term) || '%' OR
                o.tracking_code ILIKE '%' || p_search_term || '%' OR
                o.control_number::TEXT ILIKE '%' || p_search_term || '%'
            )
        ORDER BY
            CASE WHEN p_sort_key = 'control_number' AND p_sort_direction_asc THEN o.control_number END ASC,
            CASE WHEN p_sort_key = 'control_number' AND NOT p_sort_direction_asc THEN o.control_number END DESC,
            CASE WHEN p_sort_key = 'recipient_name' AND p_sort_direction_asc THEN o.recipient_name END ASC,
            CASE WHEN p_sort_key = 'recipient_name' AND NOT p_sort_direction_asc THEN o.recipient_name END DESC,
            CASE WHEN p_sort_key = 'arrival_date' AND p_sort_direction_asc THEN o.arrival_date END ASC,
            CASE WHEN p_sort_key = 'arrival_date' AND NOT p_sort_direction_asc THEN o.arrival_date END DESC,
            o.created_at DESC
        LIMIT p_page_size
        OFFSET p_page_offset
    )
    SELECT
        fo.control_number,
        fo.recipient_name::TEXT,
        fo.customer_id,
        fo.delivery_address_id,
        fo.tracking_code::TEXT,
        fo.object_type::TEXT,
        fo.arrival_date,
        fo.storage_deadline,
        fo.status::TEXT,
        fo.is_archived,
        fo.created_at,
        fo.updated_at,
        fo.delivery_street_name,
        fo.delivery_address_number,
        fo.delivery_neighborhood,
        fo.delivery_city_name,
        fo.delivery_state_uf,
        fo.delivery_cep::TEXT,
        jsonb_build_object(
            'street_name', a.street_name,
            'number', c.address_number
        ) AS addresses,
        fo.total_count
    FROM
        filtered_objects fo
    LEFT JOIN
        public.addresses a ON fo.delivery_address_id = a.id
    LEFT JOIN
        public.customers c ON fo.customer_id = c.id;
END;
$$;


-- CORREÇÃO 2: Função de sugestão de clientes para o modal
DROP FUNCTION IF EXISTS suggest_customer_links(TEXT);
CREATE OR REPLACE FUNCTION suggest_customer_links(p_search_term TEXT)
RETURNS TABLE (id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.full_name::TEXT,
        COALESCE(a.street_name || ', ' || c.address_number || ' - ' || a.neighborhood, 'Endereço não informado')::TEXT AS address_info
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    WHERE c.is_active = TRUE
      AND (
          p_search_term IS NULL OR p_search_term = '' OR
          public.f_unaccent(c.full_name) ILIKE '%' || public.f_unaccent(p_search_term) || '%'
      )
    ORDER BY c.full_name
    LIMIT 10;
END;
$$;

-- ARQUIVO: 0010_create_suggestion_function.sql
-- DESCRIÇÃO: Cria uma função RPC mais inteligente para sugerir clientes
--            para associação a um objeto.

DROP FUNCTION IF EXISTS suggest_customer_links(TEXT);
CREATE OR REPLACE FUNCTION suggest_customer_links(p_search_term TEXT)
RETURNS TABLE (id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variável para guardar o primeiro nome do termo de busca.
    v_first_name TEXT;
BEGIN
    -- Extrai o primeiro nome do termo de busca. 
    -- Ex: Se p_search_term for "João Silva", v_first_name será "João".
    v_first_name := split_part(p_search_term, ' ', 1);

    RETURN QUERY
    SELECT
        c.id,
        c.full_name::TEXT,
        -- Concatena as partes do endereço para exibição, com um fallback.
        COALESCE(a.street_name || ', ' || c.address_number || ' - ' || a.neighborhood, 'Endereço não informado')::TEXT AS address_info
    FROM 
        public.customers c
    LEFT JOIN 
        public.addresses a ON c.address_id = a.id
    WHERE 
        c.is_active = TRUE
    ORDER BY
        -- LÓGICA DE ORDENAÇÃO INTELIGENTE:
        -- 1. Primeiro, mostra os clientes cujo nome completo corresponde exatamente ao termo de busca (maior prioridade).
        CASE WHEN public.f_unaccent(c.full_name) ILIKE public.f_unaccent(p_search_term) THEN 1 ELSE 2 END,
        -- 2. Depois, mostra os clientes cujo primeiro nome corresponde (prioridade média).
        CASE WHEN public.f_unaccent(c.full_name) ILIKE public.f_unaccent(v_first_name) || '%' THEN 1 ELSE 2 END,
        -- 3. Finalmente, ordena por nome completo para manter a consistência.
        c.full_name
    LIMIT 10;
END;
$$;
