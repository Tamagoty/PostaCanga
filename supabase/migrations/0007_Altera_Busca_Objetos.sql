-- path: supabase/migrations/0007_Altera_Busca_Objetos.sql
-- =============================================================================
-- || ARQUIVO 7: ALTERAÇÃO NA FUNÇÃO DE BUSCA DE OBJETOS                      ||
-- =============================================================================
-- DESCRIÇÃO: Modifica a função 'get_paginated_objects' para incluir o status
-- do cliente (ativo/inativo) associado ao objeto. Isso é necessário para
-- que o frontend possa exibir o ícone de contato com a cor correta.

DROP FUNCTION IF EXISTS public.get_paginated_objects(TEXT, BOOLEAN, TEXT, BOOLEAN, INT, INT, TEXT[]);

CREATE OR REPLACE FUNCTION public.get_paginated_objects(
    p_search_term TEXT,
    p_show_archived BOOLEAN,
    p_sort_key TEXT,
    p_sort_direction_asc BOOLEAN,
    p_page_size INT,
    p_page_offset INT,
    p_status_filters TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    control_number INT,
    recipient_name TEXT,
    object_type VARCHAR(100),
    tracking_code VARCHAR(100),
    status VARCHAR(50),
    arrival_date DATE,
    storage_deadline DATE,
    is_archived BOOLEAN,
    customer_id UUID,
    customer_is_active BOOLEAN, -- NOVO CAMPO
    delivery_street_name TEXT,
    delivery_address_number TEXT,
    delivery_neighborhood TEXT,
    delivery_city_name TEXT,
    delivery_state_uf CHAR(2),
    delivery_cep VARCHAR(9),
    customer_address JSONB,
    total_count BIGINT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_normal_statuses TEXT[];
BEGIN
    SELECT array_agg(elem) INTO v_normal_statuses FROM unnest(p_status_filters) elem WHERE elem <> 'Vencidos';

    RETURN QUERY
    WITH filtered_objects AS (
        SELECT o.*
        FROM public.objects o
        WHERE
            o.is_archived = p_show_archived
            AND (
                p_status_filters IS NULL OR
                (
                    (v_normal_statuses IS NOT NULL AND o.status = ANY(v_normal_statuses)) OR
                    ('Vencidos' = ANY(p_status_filters) AND o.status = 'Aguardando Retirada' AND o.storage_deadline < CURRENT_DATE)
                )
            )
            AND (
                p_search_term IS NULL OR p_search_term = '' OR
                f_unaccent(o.recipient_name) ILIKE '%' || f_unaccent(p_search_term) || '%' OR
                (o.tracking_code IS NOT NULL AND f_unaccent(o.tracking_code) ILIKE '%' || f_unaccent(p_search_term) || '%') OR
                (p_search_term ~ '^\d+$' AND o.control_number = p_search_term::INT)
            )
    )
    SELECT
        fo.control_number,
        fo.recipient_name::TEXT,
        fo.object_type,
        fo.tracking_code,
        fo.status,
        fo.arrival_date,
        fo.storage_deadline,
        fo.is_archived,
        fo.customer_id,
        c.is_active AS customer_is_active, -- CAMPO ADICIONADO AQUI
        fo.delivery_street_name,
        fo.delivery_address_number,
        fo.delivery_neighborhood,
        fo.delivery_city_name,
        fo.delivery_state_uf,
        fo.delivery_cep,
        (
            SELECT jsonb_build_object(
                'street_name', a.street_name,
                'number', cust.address_number,
                'neighborhood', a.neighborhood,
                'city_name', ci.name,
                'state_uf', s.uf,
                'cep', a.cep
            )
            FROM public.customers cust
            JOIN public.addresses a ON cust.address_id = a.id
            JOIN public.cities ci ON a.city_id = ci.id
            JOIN public.states s ON ci.state_id = s.id
            WHERE cust.id = fo.customer_id
        ) as customer_address,
        (SELECT count(*) FROM filtered_objects) as total_count
    FROM filtered_objects fo
    LEFT JOIN public.customers c ON fo.customer_id = c.id -- JOIN PARA BUSCAR O STATUS
    ORDER BY
        CASE WHEN p_sort_key = 'control_number' AND p_sort_direction_asc THEN fo.control_number END ASC,
        CASE WHEN p_sort_key = 'control_number' AND NOT p_sort_direction_asc THEN fo.control_number END DESC,
        CASE WHEN p_sort_key = 'recipient_name' AND p_sort_direction_asc THEN fo.recipient_name END ASC,
        CASE WHEN p_sort_key = 'recipient_name' AND NOT p_sort_direction_asc THEN fo.recipient_name END DESC,
        CASE WHEN p_sort_key = 'storage_deadline' AND p_sort_direction_asc THEN fo.storage_deadline END ASC,
        CASE WHEN p_sort_key = 'storage_deadline' AND NOT p_sort_direction_asc THEN fo.storage_deadline END DESC,
        fo.arrival_date DESC
    LIMIT p_page_size OFFSET p_page_offset;
END;
$$;
