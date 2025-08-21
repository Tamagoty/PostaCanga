-- path: supabase/migrations/0002_fix_search_addresses_function_types.sql
-- DESCRIÇÃO: Corrige a função search_addresses para garantir que os tipos de dados
-- retornados pela consulta correspondam exatamente aos tipos definidos na função,
-- resolvendo o erro de 'structure of query does not match function result type'.

DROP FUNCTION IF EXISTS public.search_addresses(TEXT);

CREATE OR REPLACE FUNCTION public.search_addresses(p_search_term TEXT)
RETURNS TABLE (
    id UUID,
    street_name TEXT,
    neighborhood TEXT,
    city_name VARCHAR,
    state_uf CHAR(2),
    cep VARCHAR
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id::UUID,
        a.street_name::TEXT,
        a.neighborhood::TEXT,
        c.name::VARCHAR,
        s.uf::CHAR(2),
        a.cep::VARCHAR
    FROM
        public.addresses a
    LEFT JOIN
        public.cities c ON a.city_id = c.id
    LEFT JOIN
        public.states s ON c.state_id = s.id
    WHERE
        f_unaccent(a.street_name) ILIKE f_unaccent('%' || p_search_term || '%')
    ORDER BY
        a.street_name
    LIMIT 10;
END;
$$;
