-- Arquivo: supabase/migrations/048_create_contact_search_function.sql
-- Descrição: Recria a função de busca de contatos com permissões corrigidas
--            para resolver o erro de "structure of query does not match".

-- Etapa 1: Apagar a função antiga para garantir uma recriação limpa.
DROP FUNCTION IF EXISTS public.search_contacts(text);

-- Etapa 2: Recriar a função com SECURITY DEFINER.
-- Isto permite que a função seja executada com privilégios elevados,
-- resolvendo os conflitos de permissão de forma definitiva.
CREATE OR REPLACE FUNCTION search_contacts(
    p_search_term TEXT
)
RETURNS TABLE (
    id UUID,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.full_name
    FROM
        public.customers c
    WHERE
        c.is_active = TRUE
        AND c.cellphone IS NOT NULL
        AND normalize_text(c.full_name) ILIKE normalize_text('%' || p_search_term || '%')
    ORDER BY
        c.full_name
    LIMIT 20; -- Mantido o limite de 20 resultados, como você desejava.
END;
$$;
