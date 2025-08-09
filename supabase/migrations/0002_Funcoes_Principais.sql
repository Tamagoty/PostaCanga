-- path: supabase/migrations/0002_Funcoes_Principais_Final.sql
-- =============================================================================
-- || ARQUIVO 2: FUNÇÕES RPC - PRINCIPAIS                                     ||
-- =============================================================================
-- DESCRIÇÃO: Contém as funções relacionadas às entidades centrais da aplicação:
-- Endereços, Clientes e Objetos.

--------------------------------------------------------------------------------
-- FUNÇÕES DE ENDEREÇOS (ADDRESSES)
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_address(UUID);
CREATE OR REPLACE FUNCTION public.delete_address(p_address_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE is_in_use BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.customers WHERE address_id = p_address_id) INTO is_in_use;
  IF is_in_use THEN
    RAISE EXCEPTION 'Não é possível apagar o endereço, pois ele está associado a um ou mais clientes.';
  END IF;
  DELETE FROM public.addresses WHERE id = p_address_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_customers_by_address(UUID);
CREATE OR REPLACE FUNCTION public.get_customers_by_address(p_address_id UUID)
RETURNS TABLE (id UUID, full_name TEXT, address_number VARCHAR, address_complement VARCHAR, is_active BOOLEAN)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.full_name::TEXT, c.address_number, c.address_complement, c.is_active
  FROM public.customers c
  WHERE c.address_id = p_address_id
  ORDER BY c.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_address(address_id UUID, cep VARCHAR, street_name TEXT, neighborhood TEXT, city_id INT)
RETURNS addresses LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_address addresses; v_cleaned_cep TEXT;
BEGIN
    v_cleaned_cep := regexp_replace(cep, '\D', '', 'g');
    IF address_id IS NULL THEN
        INSERT INTO public.addresses (cep, street_name, neighborhood, city_id) VALUES (v_cleaned_cep, street_name, neighborhood, city_id) RETURNING * INTO result_address;
    ELSE
        UPDATE public.addresses SET cep = v_cleaned_cep, street_name = street_name, neighborhood = neighborhood, city_id = city_id, updated_at = NOW() WHERE id = address_id RETURNING * INTO result_address;
    END IF;
    RETURN result_address;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_address_by_details(p_cep TEXT, p_street_name TEXT, p_city_name TEXT, p_state_uf TEXT)
RETURNS addresses LANGUAGE plpgsql AS $$
DECLARE v_cleaned_cep TEXT; v_city_id INT; result_address addresses;
BEGIN
    v_cleaned_cep := regexp_replace(p_cep, '\D', '', 'g');
    SELECT c.id INTO v_city_id FROM public.cities c JOIN public.states s ON c.state_id = s.id WHERE f_unaccent(c.name) ILIKE f_unaccent(p_city_name) AND s.uf ILIKE p_state_uf LIMIT 1;
    IF v_city_id IS NULL THEN RETURN NULL; END IF;
    SELECT * INTO result_address FROM public.addresses a WHERE a.cep = v_cleaned_cep AND f_unaccent(a.street_name) ILIKE f_unaccent(p_street_name) AND a.city_id = v_city_id LIMIT 1;
    RETURN result_address;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_addresses(p_city_id INT, p_neighborhood TEXT, p_search_term TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE total_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.addresses WHERE (p_city_id IS NULL OR city_id = p_city_id) AND (p_neighborhood IS NULL OR f_unaccent(public.addresses.neighborhood) ILIKE f_unaccent(p_neighborhood)) AND (p_search_term IS NULL OR (f_unaccent(street_name) ILIKE f_unaccent('%' || p_search_term || '%') OR cep ILIKE '%' || p_search_term || '%'));
    RETURN total_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_neighborhoods_by_city(p_city_id INT)
RETURNS TABLE(neighborhood TEXT) LANGUAGE sql AS $$
    SELECT DISTINCT neighborhood FROM public.addresses WHERE city_id = p_city_id AND neighborhood IS NOT NULL ORDER BY neighborhood;
$$;

CREATE OR REPLACE FUNCTION public.search_cities(p_search_term TEXT)
RETURNS TABLE(id INT, name VARCHAR, uf CHAR(2)) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT c.id, c.name, s.uf FROM public.cities c JOIN public.states s ON c.state_id = s.id WHERE f_unaccent(c.name) ILIKE f_unaccent('%' || p_search_term || '%') ORDER BY c.name LIMIT 20;
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE CLIENTES (CUSTOMERS)
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_phones_for_recipients(text[]);
CREATE OR REPLACE FUNCTION public.get_phones_for_recipients(p_recipient_names TEXT[])
RETURNS JSON
LANGUAGE plpgsql STABLE AS $$
DECLARE
    result_json JSON;
BEGIN
    SELECT json_object_agg(recipient_name, phone_to_use) INTO result_json
    FROM (
        SELECT
            c.full_name AS recipient_name,
            COALESCE(c.cellphone, contact.cellphone) AS phone_to_use
        FROM public.customers c
        LEFT JOIN public.customers contact ON c.contact_customer_id = contact.id
        WHERE f_unaccent(c.full_name) = ANY(array(SELECT f_unaccent(unnest(p_recipient_names))))
    ) AS sub;
    RETURN COALESCE(result_json, '{}'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_customer(p_address_complement varchar, p_address_id uuid, p_address_number varchar, p_birth_date date, p_cellphone varchar, p_contact_customer_id uuid, p_cpf varchar, p_customer_id uuid, p_email varchar, p_full_name text)
RETURNS customers LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_customer customers;
BEGIN
    IF p_customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, cpf, cellphone, email, birth_date, contact_customer_id, address_id, address_number, address_complement) VALUES (p_full_name, p_cpf, p_cellphone, p_email, p_birth_date, p_contact_customer_id, p_address_id, p_address_number, p_address_complement) RETURNING * INTO result_customer;
    ELSE
        UPDATE public.customers SET full_name = p_full_name, cpf = p_cpf, cellphone = p_cellphone, email = p_email, birth_date = p_birth_date, contact_customer_id = p_contact_customer_id, address_id = p_address_id, address_number = p_address_number, address_complement = p_address_complement, updated_at = NOW() WHERE id = p_customer_id RETURNING * INTO result_customer;
    END IF;
    RETURN result_customer;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_customer(uuid);
CREATE OR REPLACE FUNCTION public.delete_customer(p_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE has_objects boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.objects WHERE customer_id = p_customer_id) INTO has_objects;
  IF has_objects THEN RAISE EXCEPTION 'Não é possível excluir o cliente pois ele possui objetos em seu histórico.'; END IF;
  IF EXISTS (SELECT 1 FROM public.customers WHERE contact_customer_id = p_customer_id) THEN
     UPDATE public.customers SET contact_customer_id = NULL WHERE contact_customer_id = p_customer_id;
  END IF;
  DELETE FROM public.customers WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_customer_status(p_customer_id UUID, p_is_active BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.customers SET is_active = p_is_active, updated_at = NOW() WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_customers_filtered(p_search_term TEXT, p_status_filter TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE total_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.customers WHERE (p_search_term IS NULL OR p_search_term = '' OR (f_unaccent(full_name) ILIKE f_unaccent('%' || p_search_term || '%') OR cpf ILIKE '%' || p_search_term || '%')) AND (p_status_filter IS NULL OR p_status_filter = 'all' OR (p_status_filter = 'active' AND is_active = TRUE) OR (p_status_filter = 'inactive' AND is_active = FALSE));
    RETURN total_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_paginated_customers_with_details(p_limit INT, p_offset INT, p_search_term TEXT, p_status_filter TEXT)
RETURNS TABLE (id UUID, full_name TEXT, cpf VARCHAR, cellphone VARCHAR, is_active BOOLEAN, address_info TEXT, total_count BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH filtered_customers AS (
        SELECT c.* FROM public.customers c WHERE (p_search_term IS NULL OR p_search_term = '' OR (f_unaccent(c.full_name) ILIKE f_unaccent('%' || p_search_term || '%') OR c.cpf ILIKE '%' || p_search_term || '%')) AND (p_status_filter IS NULL OR p_status_filter = 'all' OR (p_status_filter = 'active' AND c.is_active = TRUE) OR (p_status_filter = 'inactive' AND c.is_active = FALSE))
    )
    SELECT fc.id, fc.full_name::TEXT, fc.cpf, fc.cellphone, fc.is_active, COALESCE(a.street_name || ', ' || fc.address_number || ' - ' || a.neighborhood, 'Endereço não informado')::TEXT AS address_info, (SELECT count(*) FROM filtered_customers) AS total_count
    FROM filtered_customers fc LEFT JOIN public.addresses a ON fc.address_id = a.id
    ORDER BY fc.full_name LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_details(p_customer_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_customer_profile JSON; v_customer_objects JSON; v_this_customer_is_contact_for JSON; v_contacts_for_this_customer JSON; v_main_contact_associations JSON;
BEGIN
    SELECT json_build_object('id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone, 'birth_date', c.birth_date, 'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id, 'email', c.email, 'address_id', c.address_id, 'address_number', c.address_number, 'address_complement', c.address_complement, 'address', json_build_object('street_name', a.street_name, 'neighborhood', a.neighborhood, 'cep', a.cep, 'city', ci.name, 'state', s.uf)) INTO v_customer_profile FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.id = p_customer_id;
    SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o WHERE f_unaccent(o.recipient_name) ILIKE f_unaccent((SELECT full_name FROM public.customers WHERE id = p_customer_id));
    SELECT json_agg(json_build_object('id', dep.id, 'full_name', dep.full_name)) INTO v_this_customer_is_contact_for FROM public.customers dep WHERE dep.contact_customer_id = p_customer_id;
    SELECT json_agg(json_build_object('id', main.id, 'full_name', main.full_name, 'contact_customer_id', main.contact_customer_id)) INTO v_contacts_for_this_customer FROM public.customers main WHERE main.id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);
    SELECT json_agg(json_build_object('id', dep_main.id, 'full_name', dep_main.full_name)) INTO v_main_contact_associations FROM public.customers dep_main WHERE dep_main.contact_customer_id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);
    RETURN json_build_object('profile', v_customer_profile, 'objects', COALESCE(v_customer_objects, '[]'::json), 'this_customer_is_contact_for', COALESCE(v_this_customer_is_contact_for, '[]'::json), 'contacts_for_this_customer', COALESCE(v_contacts_for_this_customer, '[]'::json), 'main_contact_associations', COALESCE(v_main_contact_associations, '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION public.search_contacts(p_search_term TEXT)
RETURNS TABLE (id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT c.id, c.full_name::TEXT, COALESCE(a.street_name || ', ' || c.address_number || ' - ' || a.neighborhood, 'Endereço não informado') AS address_info FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id WHERE c.is_active = TRUE AND c.cellphone IS NOT NULL AND public.f_unaccent(c.full_name) ILIKE '%' || public.f_unaccent(p_search_term) || '%' ORDER BY c.full_name LIMIT 20;
END;
$$;

DROP FUNCTION IF EXISTS public.suggest_customers(TEXT);
CREATE OR REPLACE FUNCTION public.suggest_customers(p_search_term TEXT)
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.full_name::TEXT
    FROM public.customers c
    WHERE f_unaccent(c.full_name) ILIKE f_unaccent(p_search_term) || '%'
    ORDER BY c.full_name
    LIMIT 5;
END;
$$;

DROP FUNCTION IF EXISTS public.suggest_customer_links(TEXT);
CREATE OR REPLACE FUNCTION public.suggest_customer_links(p_search_term TEXT)
RETURNS TABLE(id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE v_first_name TEXT;
BEGIN
    v_first_name := f_unaccent(split_part(p_search_term, ' ', 1));
    RETURN QUERY
    SELECT c.id, c.full_name::TEXT, COALESCE(a.street_name || ', ' || a.neighborhood, a.street_name, 'Endereço não cadastrado')::TEXT AS address_info
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    WHERE f_unaccent(c.full_name) ILIKE v_first_name || '%' AND similarity(f_unaccent(c.full_name), f_unaccent(p_search_term)) > 0.1
    ORDER BY similarity(f_unaccent(c.full_name), f_unaccent(p_search_term)) DESC
    LIMIT 5;
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE OBJETOS (PACKAGES)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_object(p_cep TEXT, p_city_name TEXT, p_control_number INT, p_neighborhood TEXT, p_number TEXT, p_object_type TEXT, p_recipient_name TEXT, p_state_uf TEXT, p_street_name TEXT, p_tracking_code TEXT)
RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_customer_id UUID; v_storage_deadline DATE; v_storage_days INT; result_object objects;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.object_types WHERE name = p_object_type) THEN RAISE EXCEPTION 'O tipo de objeto "%" não é válido.', p_object_type; END IF;
    SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type;
    v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;
    SELECT id INTO v_customer_id FROM public.customers WHERE f_unaccent(full_name) ILIKE f_unaccent(p_recipient_name) LIMIT 1;
    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects SET recipient_name = p_recipient_name, object_type = p_object_type, tracking_code = p_tracking_code, customer_id = v_customer_id, delivery_street_name = p_street_name, delivery_address_number = p_number, delivery_neighborhood = p_neighborhood, delivery_city_name = p_city_name, delivery_state_uf = p_state_uf, delivery_cep = p_cep, delivery_address_id = CASE WHEN p_street_name IS NOT NULL THEN NULL ELSE (SELECT address_id FROM customers WHERE id = v_customer_id) END, updated_at = NOW() WHERE control_number = p_control_number RETURNING * INTO result_object;
    ELSE
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_street_name, delivery_address_number, delivery_neighborhood, delivery_city_name, delivery_state_uf, delivery_cep, delivery_address_id) VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, p_street_name, p_number, p_neighborhood, p_city_name, p_state_uf, p_cep, CASE WHEN p_street_name IS NOT NULL THEN NULL ELSE (SELECT address_id FROM customers WHERE id = v_customer_id) END) RETURNING * INTO result_object;
    END IF;
    RETURN result_object;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_create_simple_objects(p_object_type TEXT, p_objects simple_object_input[])
RETURNS TABLE (report_recipient_name TEXT, report_control_number INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE obj simple_object_input; v_recipient_name TEXT; v_street_name TEXT; v_customer_id UUID; v_storage_deadline DATE; v_new_control_number INT; v_storage_days INT;
BEGIN
    SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type;
    IF NOT FOUND THEN v_storage_days := 20; END IF;
    v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;
    FOREACH obj IN ARRAY p_objects LOOP
        v_recipient_name := obj.recipient_name;
        v_street_name := obj.street_name;
        SELECT id INTO v_customer_id FROM customers WHERE f_unaccent(full_name) ILIKE f_unaccent(v_recipient_name) LIMIT 1;
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, customer_id, delivery_street_name) VALUES (v_recipient_name, p_object_type, v_storage_deadline, v_customer_id, v_street_name) RETURNING control_number INTO v_new_control_number;
        report_recipient_name := v_recipient_name;
        report_control_number := v_new_control_number;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_create_registered_objects(p_objects registered_object_input[])
RETURNS TABLE (report_recipient_name TEXT, report_tracking_code TEXT, report_control_number INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE obj registered_object_input; v_customer_id UUID; v_storage_deadline DATE; v_storage_days INT; v_new_control_number INT;
BEGIN
    FOREACH obj IN ARRAY p_objects LOOP
        SELECT COALESCE(tcr.storage_days, ot.default_storage_days, 20) INTO v_storage_days FROM public.object_types ot LEFT JOIN public.tracking_code_rules tcr ON SUBSTRING(obj.tracking_code FROM 1 FOR 2) = tcr.prefix WHERE ot.name = obj.object_type;
        v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;
        SELECT id INTO v_customer_id FROM public.customers WHERE f_unaccent(full_name) ILIKE f_unaccent(obj.recipient_name) LIMIT 1;
        INSERT INTO public.objects (recipient_name, object_type, tracking_code, storage_deadline, customer_id, delivery_street_name, delivery_address_number) VALUES (obj.recipient_name, obj.object_type, obj.tracking_code, v_storage_deadline, v_customer_id, obj.street_name, obj.address_number) RETURNING control_number INTO v_new_control_number;
        report_recipient_name := obj.recipient_name;
        report_tracking_code := obj.tracking_code;
        report_control_number := v_new_control_number;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_object_to_customer(p_control_number INT, p_customer_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects SET customer_id = p_customer_id, recipient_name = (SELECT full_name FROM public.customers WHERE id = p_customer_id) WHERE control_number = p_control_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_object_status(p_control_number INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects SET status = 'Aguardando Retirada', updated_at = NOW() WHERE control_number = p_control_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.deliver_object(p_control_number INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects SET status = 'Entregue', updated_at = NOW() WHERE control_number = p_control_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_object(p_control_number INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects SET status = 'Devolvido', updated_at = NOW() WHERE control_number = p_control_number;
END;
$$;

DROP FUNCTION IF EXISTS public.archive_completed_objects();
CREATE OR REPLACE FUNCTION public.archive_completed_objects()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN 
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; 
    END IF;
    UPDATE public.objects
    SET is_archived = TRUE
    WHERE
        status IN ('Entregue', 'Devolvido')
        AND is_archived = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.unarchive_object(p_control_number INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects SET is_archived = FALSE WHERE control_number = p_control_number;
END;
$$;
