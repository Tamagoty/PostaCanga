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
