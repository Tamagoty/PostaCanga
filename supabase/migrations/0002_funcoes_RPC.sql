-- =============================================================================
-- || Arquivo supabase/mitations/0002_funcoes_RPC.sql
-- || FUNÇÕES RPC - POSTACANGA APP                                            ||
-- =============================================================================
-- DESCRIÇÃO: Script contendo todas as funções de chamada de procedimento remoto (RPC)
--            utilizadas na aplicação.

--------------------------------------------------------------------------------
-- FUNÇÕES BASE E AUXILIARES
--------------------------------------------------------------------------------
-- Cria uma função "wrapper" imutável para unaccent da qual somos donos.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'public'
AS $function$
    SELECT public.unaccent('unaccent', $1);
$function$;

-- Retorna o "role" (permissão) do utilizador autenticado.
DROP FUNCTION IF EXISTS public.get_my_role();
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$ BEGIN RETURN (SELECT role FROM public.employees WHERE id = auth.uid()); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------------------------------------
-- FUNÇÕES DE GESTÃO DE OBJETOS
--------------------------------------------------------------------------------
-- Cria ou atualiza um objeto, com a lógica de priorizar o endereço do objeto.
DROP FUNCTION IF EXISTS create_or_update_object(TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_object(
    p_recipient_name TEXT,
    p_object_type TEXT,
    p_tracking_code TEXT DEFAULT NULL,
    p_control_number INT DEFAULT NULL,
    p_cep TEXT DEFAULT NULL,
    p_street_name TEXT DEFAULT NULL,
    p_number TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_city_name TEXT DEFAULT NULL,
    p_state_uf TEXT DEFAULT NULL
)
RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_customer_id UUID;
    v_storage_deadline DATE;
    v_storage_days INT;
    result_object objects;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.object_types WHERE name = p_object_type) THEN
        RAISE EXCEPTION 'O tipo de objeto "%" não é válido.', p_object_type;
    END IF;
    SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type;
    v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;

    SELECT id INTO v_customer_id FROM public.customers WHERE f_unaccent(full_name) ILIKE f_unaccent(p_recipient_name) LIMIT 1;

    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects SET
            recipient_name = p_recipient_name,
            object_type = p_object_type,
            tracking_code = p_tracking_code,
            customer_id = v_customer_id,
            delivery_street_name = p_street_name,
            delivery_address_number = p_number,
            delivery_neighborhood = p_neighborhood,
            delivery_city_name = p_city_name,
            delivery_state_uf = p_state_uf,
            delivery_cep = p_cep,
            delivery_address_id = CASE WHEN p_street_name IS NULL THEN (SELECT address_id FROM customers WHERE id = v_customer_id) ELSE NULL END,
            updated_at = NOW()
        WHERE control_number = p_control_number
        RETURNING * INTO result_object;
    ELSE
        INSERT INTO public.objects (
            recipient_name, object_type, storage_deadline, tracking_code, customer_id,
            delivery_street_name, delivery_address_number, delivery_neighborhood,
            delivery_city_name, delivery_state_uf, delivery_cep, delivery_address_id
        )
        VALUES (
            p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id,
            p_street_name, p_number, p_neighborhood, p_city_name, p_state_uf, p_cep,
            CASE WHEN p_street_name IS NULL THEN (SELECT address_id FROM customers WHERE id = v_customer_id) ELSE NULL END
        )
        RETURNING * INTO result_object;
    END IF;

    RETURN result_object;
END;
$$;

-- Inserção em massa de objetos simples, com endereço direto no objeto.
DROP FUNCTION IF EXISTS bulk_create_simple_objects(TEXT,simple_object_input[]);
CREATE OR REPLACE FUNCTION bulk_create_simple_objects(p_object_type TEXT, p_objects simple_object_input[])
RETURNS TABLE (report_recipient_name TEXT, report_control_number INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    obj simple_object_input;
    v_recipient_name TEXT;
    v_street_name TEXT;
    v_customer_id UUID;
    v_storage_deadline DATE;
    v_new_control_number INT;
    v_storage_days INT;
BEGIN
    SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type;
    IF NOT FOUND THEN
        v_storage_days := 20; -- Fallback
    END IF;
    v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;

    FOREACH obj IN ARRAY p_objects
    LOOP
        v_recipient_name := proper_case(obj.recipient_name);
        v_street_name := proper_case(obj.street_name);

        -- Tenta encontrar um cliente para associação, mas não é obrigatório
        SELECT id INTO v_customer_id FROM customers WHERE f_unaccent(full_name) ILIKE f_unaccent(v_recipient_name) LIMIT 1;

        INSERT INTO public.objects (
            recipient_name,
            object_type,
            storage_deadline,
            customer_id,
            delivery_street_name -- Salva o endereço diretamente no objeto
        )
        VALUES (
            v_recipient_name,
            p_object_type,
            v_storage_deadline,
            v_customer_id,
            v_street_name
        )
        RETURNING control_number INTO v_new_control_number;

        report_recipient_name := v_recipient_name;
        report_control_number := v_new_control_number;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;


--------------------------------------------------------------------------------
-- FUNÇÕES DE CONSULTA E RELATÓRIOS
--------------------------------------------------------------------------------
-- Função de exportação para o formato correto do Google Contacts.
DROP FUNCTION IF EXISTS public.get_customers_for_export();
CREATE OR REPLACE FUNCTION get_customers_for_export()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    export_data JSONB;
BEGIN
    SELECT
        jsonb_agg(t)
    INTO
        export_data
    FROM (
        SELECT
            c.full_name,
            c.cellphone AS cellphone_to_use,
            c.is_active,
            c.birth_date,
            c.email,
            a.street_name,
            c.address_number,
            a.neighborhood,
            ci.name AS city_name,
            s.uf AS state_uf,
            a.cep,
            (
                SELECT STRING_AGG(dependent.full_name, ', ')
                FROM public.customers dependent
                WHERE dependent.contact_customer_id = c.id
            ) AS associated_contacts
        FROM
            public.customers c
        LEFT JOIN
            public.addresses a ON c.address_id = a.id
        LEFT JOIN
            public.cities ci ON a.city_id = ci.id
        LEFT JOIN
            public.states s ON ci.state_id = s.id
        WHERE
            c.cellphone IS NOT NULL AND c.cellphone <> ''
    ) t;

    RETURN COALESCE(export_data, '[]'::jsonb);
END;
$$;

-- CORREÇÃO: Adicionado casting explícito (::TEXT) para garantir a correspondência de tipos.
DROP FUNCTION IF EXISTS get_objects_for_notification_by_filter(INT, INT, DATE, DATE);
CREATE OR REPLACE FUNCTION get_objects_for_notification_by_filter(
    p_start_control INT DEFAULT NULL,
    p_end_control INT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    control_number INT,
    recipient_name TEXT,
    object_type TEXT,
    storage_deadline DATE,
    phone_to_use TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.control_number,
        o.recipient_name::TEXT,
        o.object_type::TEXT,
        o.storage_deadline,
        COALESCE(c.cellphone, contact.cellphone)::TEXT AS phone_to_use
    FROM
        public.objects o
    LEFT JOIN
        public.customers c ON o.customer_id = c.id
    LEFT JOIN
        public.customers contact ON c.contact_customer_id = contact.id
    WHERE
        o.status = 'Aguardando Retirada'
        AND o.is_archived = FALSE
        AND (
            (p_start_control IS NULL OR p_end_control IS NULL) OR
            o.control_number BETWEEN p_start_control AND p_end_control
        )
        AND (
            (p_start_date IS NULL OR p_end_date IS NULL) OR
            o.arrival_date BETWEEN p_start_date AND p_end_date
        )
        AND COALESCE(c.cellphone, contact.cellphone) IS NOT NULL 
        AND COALESCE(c.cellphone, contact.cellphone) <> '';
END;
$$;

-- FUNÇÃO ATUALIZADA: get_customer_details
-- Agora inclui o bairro e o CEP no objeto de endereço.
DROP FUNCTION IF EXISTS get_customer_details(UUID);
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_customer_profile JSON;
    v_customer_objects JSON;
    v_this_customer_is_contact_for JSON;
    v_contacts_for_this_customer JSON;
    v_main_contact_associations JSON;
BEGIN
    SELECT
        json_build_object(
            'id', c.id,
            'full_name', c.full_name,
            'cpf', c.cpf,
            'cellphone', c.cellphone,
            'birth_date', c.birth_date,
            'is_active', c.is_active,
            'contact_customer_id', c.contact_customer_id,
            'email', c.email,
            'address_id', c.address_id,
            'address_number', c.address_number,
            'address_complement', c.address_complement,
            'address', json_build_object(
                'street_name', a.street_name,
                'neighborhood', a.neighborhood, -- Adicionado
                'cep', a.cep,                   -- Adicionado
                'city', ci.name,
                'state', s.uf
            )
        )
    INTO v_customer_profile
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    LEFT JOIN public.cities ci ON a.city_id = ci.id
    LEFT JOIN public.states s ON ci.state_id = s.id
    WHERE c.id = p_customer_id;

    SELECT json_agg(o.*) INTO v_customer_objects
    FROM public.objects o
    WHERE f_unaccent(o.recipient_name) ILIKE f_unaccent((SELECT full_name FROM public.customers WHERE id = p_customer_id));

    SELECT json_agg(json_build_object('id', dep.id, 'full_name', dep.full_name))
    INTO v_this_customer_is_contact_for
    FROM public.customers dep WHERE dep.contact_customer_id = p_customer_id;

    SELECT json_agg(json_build_object('id', main.id, 'full_name', main.full_name, 'contact_customer_id', main.contact_customer_id))
    INTO v_contacts_for_this_customer
    FROM public.customers main WHERE main.id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);

    SELECT json_agg(json_build_object('id', dep_main.id, 'full_name', dep_main.full_name))
    INTO v_main_contact_associations
    FROM public.customers dep_main WHERE dep_main.contact_customer_id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);

    RETURN json_build_object(
        'profile', v_customer_profile,
        'objects', COALESCE(v_customer_objects, '[]'::json),
        'this_customer_is_contact_for', COALESCE(v_this_customer_is_contact_for, '[]'::json),
        'contacts_for_this_customer', COALESCE(v_contacts_for_this_customer, '[]'::json),
        'main_contact_associations', COALESCE(v_main_contact_associations, '[]'::json)
    );
END;
$$;