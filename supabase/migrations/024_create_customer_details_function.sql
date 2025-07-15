-- Arquivo: supabase/migrations/024_create_customer_details_function.sql
-- Descrição: Cria uma função RPC para buscar os detalhes completos de um cliente,
--            incluindo seu perfil, endereço e todos os objetos associados.

CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_profile JSON;
    v_customer_objects JSON;
BEGIN
    -- Etapa 1: Buscar o perfil do cliente e os detalhes do seu endereço.
    SELECT
        json_build_object(
            'id', c.id,
            'full_name', c.full_name,
            'cpf', c.cpf,
            'cellphone', c.cellphone,
            'birth_date', c.birth_date,
            'is_active', c.is_active,
            'contact_customer_id', c.contact_customer_id,
            'address_id', c.address_id,
            'addresses', a -- Inclui o objeto de endereço completo
        )
    INTO v_customer_profile
    FROM
        public.customers c
    LEFT JOIN
        public.addresses a ON c.address_id = a.id
    WHERE
        c.id = p_customer_id;

    -- Etapa 2: Buscar todos os objetos associados ao nome completo do cliente.
    SELECT
        json_agg(o.*)
    INTO v_customer_objects
    FROM
        public.objects o
    WHERE
        o.recipient_name ILIKE (SELECT full_name FROM public.customers WHERE id = p_customer_id);

    -- Etapa 3: Retornar um único objeto JSON com o perfil e os objetos.
    RETURN json_build_object(
        'profile', v_customer_profile,
        'objects', COALESCE(v_customer_objects, '[]'::json)
    );
END;
$$;
