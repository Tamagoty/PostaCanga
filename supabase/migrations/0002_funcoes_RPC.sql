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

-- NOVA FUNÇÃO: Busca objetos para notificação em lote por filtros
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
    WITH objects_to_notify AS (
        SELECT
            o.control_number,
            o.recipient_name,
            o.object_type,
            o.storage_deadline,
            -- Lógica para encontrar o telemóvel:
            -- 1. Tenta o telemóvel do cliente associado ao objeto.
            -- 2. Se não tiver, tenta o telemóvel do contato principal desse cliente.
            COALESCE(c.cellphone, contact.cellphone) as phone_to_use
        FROM
            public.objects o
        LEFT JOIN
            public.customers c ON o.customer_id = c.id
        LEFT JOIN
            public.customers contact ON c.contact_customer_id = contact.id
        WHERE
            o.status = 'Aguardando Retirada'
            AND o.is_archived = FALSE
            -- Aplica o filtro de faixa de número de controlo
            AND (
                (p_start_control IS NULL OR p_end_control IS NULL) OR
                o.control_number BETWEEN p_start_control AND p_end_control
            )
            -- Aplica o filtro de data de chegada
            AND (
                (p_start_date IS NULL OR p_end_date IS NULL) OR
                o.arrival_date BETWEEN p_start_date AND p_end_date
            )
    )
    SELECT
        otn.control_number,
        otn.recipient_name,
        otn.object_type,
        otn.storage_deadline,
        otn.phone_to_use
    FROM
        objects_to_notify otn
    WHERE
        otn.phone_to_use IS NOT NULL AND otn.phone_to_use <> '';
END;
$$;

