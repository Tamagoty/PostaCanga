-- path: supabase/migrations/0008_refine_linker_functions.sql
-- DESCRIÇÃO: Aprimora as funções de sugestão de clientes e de busca de objetos
-- não ligados para refinar a funcionalidade de "Ligar Rápido".

-- 1. Melhora a função de sugestão de clientes para ser mais tolerante a erros de digitação.
DROP FUNCTION IF EXISTS public.suggest_customer_links(TEXT);
CREATE OR REPLACE FUNCTION public.suggest_customer_links(p_search_term TEXT)
RETURNS TABLE(id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_first_name TEXT;
BEGIN
    -- Extrai o primeiro nome para ancorar a busca, que geralmente está correto.
    v_first_name := f_unaccent(trim(split_part(p_search_term, ' ', 1)));

    RETURN QUERY
    SELECT
        c.id,
        c.full_name::TEXT,
        COALESCE(a.street_name || ', ' || a.neighborhood, a.street_name, 'Endereço não cadastrado')::TEXT AS address_info
    FROM
        public.customers c
    LEFT JOIN
        public.addresses a ON c.address_id = a.id
    WHERE
        -- Garante que o nome do cliente comece com o primeiro nome pesquisado.
        f_unaccent(c.full_name) ILIKE v_first_name || '%'
    ORDER BY
        -- Ordena pela distância de Levenshtein, que é excelente para corrigir
        -- pequenos erros de digitação no nome completo (ex: "Lurdes" vs "Lourdes").
        levenshtein(f_unaccent(c.full_name), f_unaccent(p_search_term)) ASC
    LIMIT 10;
END;
$$;


-- 2. Atualiza a função que busca objetos não ligados para incluir o endereço e ordenar pelos mais recentes.
DROP FUNCTION IF EXISTS public.get_unlinked_objects();
CREATE OR REPLACE FUNCTION public.get_unlinked_objects()
RETURNS TABLE (
    control_number INT,
    recipient_name TEXT,
    arrival_date DATE,
    delivery_address TEXT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.control_number::INT,
        o.recipient_name::TEXT,
        o.arrival_date::DATE,
        -- Constrói a string de endereço a partir dos campos de entrega, tratando valores nulos.
        TRIM(BOTH ' ,-' FROM COALESCE(o.delivery_street_name, '') ||
             COALESCE(', ' || o.delivery_address_number, '') ||
             COALESCE(' - ' || o.delivery_neighborhood, ''))::TEXT AS delivery_address
    FROM
        public.objects o
    WHERE
        o.customer_id IS NULL
        AND o.is_archived = FALSE
        AND o.status = 'Aguardando Retirada'
    ORDER BY
        -- Ordena do mais recente para o mais antigo.
        o.arrival_date DESC, o.control_number DESC;
END;
$$;
