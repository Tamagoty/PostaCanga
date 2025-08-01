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
