-- Arquivo: supabase/migrations/050_update_customer_details_with_associations.sql
-- Descrição: Altera a função de detalhes do cliente para incluir as listas de contatos associados.

DROP FUNCTION IF EXISTS public.get_customer_details(uuid);

CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_profile JSON;
    v_customer_objects JSON;
    v_this_customer_is_contact_for JSON; -- Lista de quem este cliente é o contato
    v_contacts_for_this_customer JSON; -- O contato deste cliente
    v_main_contact_associations JSON; -- As associações do contato principal
BEGIN
    -- Etapa 1: Buscar o perfil do cliente e os detalhes do seu endereço.
    SELECT
        json_build_object(
            'id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone,
            'birth_date', c.birth_date, 'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id,
            'email', c.email, 'address_id', c.address_id, 'address_number', c.address_number,
            'address_complement', c.address_complement,
            'address', json_build_object(
                'street_name', a.street_name, 'neighborhood', a.neighborhood, 'cep', a.cep,
                'city', ci.name, 'state', s.uf
            )
        )
    INTO v_customer_profile
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    LEFT JOIN public.cities ci ON a.city_id = ci.id
    LEFT JOIN public.states s ON ci.state_id = s.id
    WHERE c.id = p_customer_id;

    -- Etapa 2: Buscar o histórico de objetos do cliente.
    SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o
    WHERE normalize_text(o.recipient_name) = normalize_text((SELECT full_name FROM public.customers WHERE id = p_customer_id));

    -- Etapa 3: Buscar a lista de clientes para quem ESTE cliente serve de contato.
    SELECT json_agg(json_build_object('id', dep.id, 'full_name', dep.full_name))
    INTO v_this_customer_is_contact_for
    FROM public.customers dep
    WHERE dep.contact_customer_id = p_customer_id;

    -- Etapa 4: Buscar o perfil do cliente que é o contato DESTE cliente.
    SELECT json_agg(json_build_object('id', main.id, 'full_name', main.full_name, 'contact_customer_id', main.contact_customer_id))
    INTO v_contacts_for_this_customer
    FROM public.customers main
    WHERE main.id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);

    -- Etapa 5: Se este cliente tiver um contato principal, buscar também as associações desse contato principal.
    SELECT json_agg(json_build_object('id', dep_main.id, 'full_name', dep_main.full_name))
    INTO v_main_contact_associations
    FROM public.customers dep_main
    WHERE dep_main.contact_customer_id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);


    -- Etapa 6: Retornar um único objeto JSON com todas as informações.
    RETURN json_build_object(
        'profile', v_customer_profile,
        'objects', COALESCE(v_customer_objects, '[]'::json),
        'this_customer_is_contact_for', COALESCE(v_this_customer_is_contact_for, '[]'::json),
        'contacts_for_this_customer', COALESCE(v_contacts_for_this_customer, '[]'::json),
        'main_contact_associations', COALESCE(v_main_contact_associations, '[]'::json)
    );
END;
$$;
