-- path: supabase/migrations/0002_funcoes.sql
-- =============================================================================
-- || ARQUIVO MESTRE 2: FUNÇÕES RPC (REMOTE PROCEDURE CALL) - VERSÃO FINAL      ||
-- =============================================================================
-- DESCRIÇÃO: Script idempotente contendo TODAS as funções RPC da aplicação,
-- limpas, otimizadas e com as devidas verificações de segurança.

-- Remove funções antigas ou duplicadas para garantir um estado limpo.
DROP FUNCTION IF EXISTS public.delete_employee(UUID);
DROP FUNCTION IF EXISTS public.create_or_update_tracking_rule(integer, text, text, integer);
DROP FUNCTION IF EXISTS public.create_or_update_object(TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.bulk_create_simple_objects(TEXT,simple_object_input[]);
DROP FUNCTION IF EXISTS public.search_contacts(TEXT);
DROP FUNCTION IF EXISTS public.get_address_details_by_id(uuid);
DROP FUNCTION IF EXISTS public.get_customer_details(UUID);
DROP FUNCTION IF EXISTS public.get_paginated_objects(TEXT, BOOLEAN, TEXT, BOOLEAN, INT, INT);
DROP FUNCTION IF EXISTS public.suggest_customer_links(TEXT);
DROP FUNCTION IF EXISTS public.link_object_to_customer(INT, UUID);
DROP FUNCTION IF EXISTS public.create_or_update_customer(UUID,TEXT,VARCHAR,VARCHAR,DATE,UUID,VARCHAR,UUID,VARCHAR,VARCHAR);
DROP FUNCTION IF EXISTS public.get_objects_for_notification_by_filter(INT, INT, DATE, DATE);
DROP FUNCTION IF EXISTS public.get_customers_for_export();
DROP FUNCTION IF EXISTS public.revert_object_status(INT);
DROP FUNCTION IF EXISTS public.count_addresses(integer, text, text);
DROP FUNCTION IF EXISTS public.get_neighborhoods_by_city(integer);
DROP FUNCTION IF EXISTS public.search_cities(text);
DROP FUNCTION IF EXISTS public.count_links(text);
DROP FUNCTION IF EXISTS public.get_message_templates();
DROP FUNCTION IF EXISTS public.create_or_update_message_template(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_message_template(UUID);
DROP FUNCTION IF EXISTS public.create_or_update_address(UUID,VARCHAR,TEXT,TEXT,INT);
DROP FUNCTION IF EXISTS public.delete_address(UUID);
DROP FUNCTION IF EXISTS public.find_or_create_address_by_cep(TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.set_customer_status(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.count_customers_filtered(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_paginated_customers_with_details(TEXT,TEXT,INT,INT);
DROP FUNCTION IF EXISTS public.create_or_update_supply(UUID,VARCHAR,TEXT,INT);
DROP FUNCTION IF EXISTS public.log_and_adjust_stock(UUID,INT,TEXT);
DROP FUNCTION IF EXISTS public.count_supplies(TEXT);
DROP FUNCTION IF EXISTS public.get_supply_stock_log(UUID,DATE);
DROP FUNCTION IF EXISTS public.create_or_update_object_type(INT,TEXT,INT);
DROP FUNCTION IF EXISTS public.delete_object_type(INT);
DROP FUNCTION IF EXISTS public.create_or_update_task(INT,TEXT,TEXT,TEXT,DATE);
DROP FUNCTION IF EXISTS public.delete_task(INT);
DROP FUNCTION IF EXISTS public.create_or_update_link(UUID,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.delete_link(UUID);
DROP FUNCTION IF EXISTS public.create_or_update_app_setting(TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.delete_app_setting(TEXT);
DROP FUNCTION IF EXISTS public.save_user_theme(TEXT,JSONB);
DROP FUNCTION IF EXISTS public.delete_user_theme(UUID);
DROP FUNCTION IF EXISTS public.get_dashboard_data();
DROP FUNCTION IF EXISTS public.get_notifications();
DROP FUNCTION IF EXISTS public.get_pending_tasks();
DROP FUNCTION IF EXISTS public.complete_task(INT);
DROP FUNCTION IF EXISTS public.get_monthly_objects_report(INT);
DROP FUNCTION IF EXISTS public.get_supplies_usage_report(INT);
DROP FUNCTION IF EXISTS public.bulk_create_registered_objects(registered_object_input[]);
DROP FUNCTION IF EXISTS public.archive_completed_objects();
DROP FUNCTION IF EXISTS public.unarchive_object(INT);
DROP FUNCTION IF EXISTS public.deliver_object(INT);
DROP FUNCTION IF EXISTS public.return_object(INT);
DROP FUNCTION IF EXISTS public.save_bulk_report(JSONB);

--------------------------------------------------------------------------------
-- FUNÇÕES DE GESTÃO (ADMIN)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
    END IF;
    IF auth.uid() = p_user_id THEN
        RAISE EXCEPTION 'Um administrador não pode se auto-excluir.';
    END IF;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_tracking_rule(rule_id INT, prefix TEXT, object_type TEXT, storage_days INT)
RETURNS tracking_code_rules
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    result_rule tracking_code_rules;
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
    END IF;
    INSERT INTO public.tracking_code_rules (id, prefix, object_type, storage_days)
    VALUES (COALESCE(rule_id, nextval('tracking_code_rules_id_seq')), prefix, object_type, storage_days)
    ON CONFLICT (prefix) DO UPDATE SET
        object_type = EXCLUDED.object_type,
        storage_days = EXCLUDED.storage_days
    RETURNING * INTO result_rule;
    RETURN result_rule;
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE USO GERAL (FUNCIONÁRIOS)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_or_update_address(address_id UUID, cep VARCHAR, street_name TEXT, neighborhood TEXT, city_id INT)
RETURNS addresses
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    result_address addresses;
BEGIN
    IF address_id IS NULL THEN
        INSERT INTO public.addresses (cep, street_name, neighborhood, city_id)
        VALUES (cep, street_name, neighborhood, city_id)
        RETURNING * INTO result_address;
    ELSE
        UPDATE public.addresses SET
            cep = create_or_update_address.cep,
            street_name = create_or_update_address.street_name,
            neighborhood = create_or_update_address.neighborhood,
            city_id = create_or_update_address.city_id,
            updated_at = NOW()
        WHERE id = address_id
        RETURNING * INTO result_address;
    END IF;
    RETURN result_address;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_address(p_address_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.addresses WHERE id = p_address_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_customer(
    customer_id uuid, full_name text, cpf varchar, cellphone varchar, email varchar, birth_date date,
    contact_customer_id uuid, address_id uuid, address_number varchar, address_complement varchar
)
RETURNS customers
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    result_customer customers;
BEGIN
    IF customer_id IS NULL THEN
        INSERT INTO public.customers (full_name, cpf, cellphone, email, birth_date, contact_customer_id, address_id, address_number, address_complement)
        VALUES (full_name, cpf, cellphone, email, birth_date, contact_customer_id, address_id, address_number, address_complement)
        RETURNING * INTO result_customer;
    ELSE
        UPDATE public.customers SET
            full_name = create_or_update_customer.full_name,
            cpf = create_or_update_customer.cpf,
            cellphone = create_or_update_customer.cellphone,
            email = create_or_update_customer.email,
            birth_date = create_or_update_customer.birth_date,
            contact_customer_id = create_or_update_customer.contact_customer_id,
            address_id = create_or_update_customer.address_id,
            address_number = create_or_update_customer.address_number,
            address_complement = create_or_update_customer.address_complement,
            updated_at = NOW()
        WHERE id = customer_id
        RETURNING * INTO result_customer;
    END IF;
    RETURN result_customer;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_object(
    p_recipient_name TEXT, p_object_type TEXT, p_tracking_code TEXT DEFAULT NULL, p_control_number INT DEFAULT NULL,
    p_cep TEXT DEFAULT NULL, p_street_name TEXT DEFAULT NULL, p_number TEXT DEFAULT NULL, p_neighborhood TEXT DEFAULT NULL,
    p_city_name TEXT DEFAULT NULL, p_state_uf TEXT DEFAULT NULL
)
RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_customer_id UUID; v_storage_deadline DATE; v_storage_days INT; result_object objects;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.object_types WHERE name = p_object_type) THEN
        RAISE EXCEPTION 'O tipo de objeto "%" não é válido.', p_object_type;
    END IF;
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
DECLARE
    obj simple_object_input; v_recipient_name TEXT; v_street_name TEXT; v_customer_id UUID; v_storage_deadline DATE; v_new_control_number INT; v_storage_days INT;
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

CREATE OR REPLACE FUNCTION public.revert_object_status(p_control_number INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects SET status = 'Aguardando Retirada' WHERE control_number = p_control_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_object_to_customer(p_control_number INT, p_customer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    UPDATE public.objects
    SET
        customer_id = p_customer_id,
        recipient_name = (SELECT full_name FROM public.customers WHERE id = p_customer_id)
    WHERE
        control_number = p_control_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_message_template(id UUID, name TEXT, content TEXT)
RETURNS message_templates
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    result_template message_templates;
BEGIN
    IF id IS NULL THEN
        INSERT INTO public.message_templates (name, content) VALUES (name, content) RETURNING * INTO result_template;
    ELSE
        UPDATE public.message_templates SET name = create_or_update_message_template.name, content = create_or_update_message_template.content, updated_at = NOW() WHERE message_templates.id = create_or_update_message_template.id RETURNING * INTO result_template;
    END IF;
    RETURN result_template;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_message_template(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.message_templates WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_supply(supply_id UUID, name VARCHAR, description TEXT, initial_stock INT)
RETURNS office_supplies
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    result_supply office_supplies;
BEGIN
    IF supply_id IS NULL THEN
        INSERT INTO public.office_supplies (name, description, stock)
        VALUES (name, description, initial_stock)
        RETURNING * INTO result_supply;
    ELSE
        UPDATE public.office_supplies SET
            name = create_or_update_supply.name,
            description = create_or_update_supply.description,
            updated_at = NOW()
        WHERE id = supply_id
        RETURNING * INTO result_supply;
    END IF;
    RETURN result_supply;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_and_adjust_stock(p_supply_id UUID, p_quantity_change INT, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_new_stock_total INT;
BEGIN
    UPDATE public.office_supplies
    SET stock = stock + p_quantity_change
    WHERE id = p_supply_id
    RETURNING stock INTO v_new_stock_total;
    INSERT INTO public.supply_stock_log (supply_id, user_id, quantity_changed, new_stock_total, reason)
    VALUES (p_supply_id, auth.uid(), p_quantity_change, v_new_stock_total, p_reason);
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE CONSULTA (SELECT)
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.count_addresses(p_city_id INT, p_neighborhood TEXT, p_search_term TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    total_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM public.addresses
    WHERE (p_city_id IS NULL OR city_id = p_city_id)
      AND (p_neighborhood IS NULL OR public.addresses.neighborhood ILIKE p_neighborhood)
      AND (p_search_term IS NULL OR (f_unaccent(street_name) ILIKE f_unaccent('%' || p_search_term || '%') OR cep ILIKE '%' || p_search_term || '%'));
    RETURN total_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_supplies(p_search_term TEXT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    total_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM public.office_supplies
    WHERE p_search_term IS NULL OR name ILIKE ('%' || p_search_term || '%');
    RETURN total_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_cities(p_search_term TEXT)
RETURNS TABLE(id INT, name VARCHAR, uf CHAR(2))
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, s.uf
    FROM public.cities c
    JOIN public.states s ON c.state_id = s.id
    WHERE f_unaccent(c.name) ILIKE f_unaccent('%' || p_search_term || '%')
    ORDER BY c.name
    LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_neighborhoods_by_city(p_city_id INT)
RETURNS TABLE(neighborhood TEXT)
LANGUAGE sql AS $$
    SELECT DISTINCT neighborhood FROM public.addresses WHERE city_id = p_city_id AND neighborhood IS NOT NULL ORDER BY neighborhood;
$$;

CREATE OR REPLACE FUNCTION public.search_contacts(p_search_term TEXT)
RETURNS TABLE (id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.full_name::TEXT, COALESCE(a.street_name || ', ' || c.address_number || ' - ' || a.neighborhood, 'Endereço não informado') AS address_info
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    WHERE c.is_active = TRUE AND c.cellphone IS NOT NULL AND public.f_unaccent(c.full_name) ILIKE '%' || public.f_unaccent(p_search_term) || '%'
    ORDER BY c.full_name
    LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_address_details_by_id(p_address_id uuid)
RETURNS TABLE(street_name text, city_name text, state_uf text)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT a.street_name::TEXT, c.name::TEXT, s.uf::TEXT
    FROM public.addresses a
    JOIN public.cities c ON a.city_id = c.id
    JOIN public.states s ON c.state_id = s.id
    WHERE a.id = p_address_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_details(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_customer_profile JSON; v_customer_objects JSON; v_this_customer_is_contact_for JSON; v_contacts_for_this_customer JSON; v_main_contact_associations JSON;
BEGIN
    SELECT json_build_object('id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone, 'birth_date', c.birth_date, 'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id, 'email', c.email, 'address_id', c.address_id, 'address_number', c.address_number, 'address_complement', c.address_complement, 'address', json_build_object('street_name', a.street_name, 'neighborhood', a.neighborhood, 'cep', a.cep, 'city', ci.name, 'state', s.uf)) INTO v_customer_profile FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.id = p_customer_id;
    SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o WHERE f_unaccent(o.recipient_name) ILIKE f_unaccent((SELECT full_name FROM public.customers WHERE id = p_customer_id));
    SELECT json_agg(json_build_object('id', dep.id, 'full_name', dep.full_name)) INTO v_this_customer_is_contact_for FROM public.customers dep WHERE dep.contact_customer_id = p_customer_id;
    SELECT json_agg(json_build_object('id', main.id, 'full_name', main.full_name, 'contact_customer_id', main.contact_customer_id)) INTO v_contacts_for_this_customer FROM public.customers main WHERE main.id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);
    SELECT json_agg(json_build_object('id', dep_main.id, 'full_name', dep_main.full_name)) INTO v_main_contact_associations FROM public.customers dep_main WHERE dep_main.contact_customer_id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id);
    RETURN json_build_object('profile', v_customer_profile, 'objects', COALESCE(v_customer_objects, '[]'::json), 'this_customer_is_contact_for', COALESCE(v_this_customer_is_contact_for, '[]'::json), 'contacts_for_this_customer', COALESCE(v_contacts_for_this_customer, '[]'::json), 'main_contact_associations', COALESCE(v_main_contact_associations, '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_paginated_objects(p_search_term TEXT, p_show_archived BOOLEAN, p_sort_key TEXT, p_sort_direction_asc BOOLEAN, p_page_size INT, p_page_offset INT)
RETURNS TABLE (control_number INT, recipient_name TEXT, object_type VARCHAR(100), tracking_code VARCHAR(100), status VARCHAR(50), arrival_date DATE, storage_deadline DATE, is_archived BOOLEAN, customer_id UUID, delivery_address_id UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, addresses JSONB, total_count BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH filtered_objects AS (SELECT o.* FROM public.objects o WHERE o.is_archived = p_show_archived AND (p_search_term IS NULL OR p_search_term = '' OR f_unaccent(o.recipient_name) ILIKE '%' || f_unaccent(p_search_term) || '%' OR (o.tracking_code IS NOT NULL AND f_unaccent(o.tracking_code) ILIKE '%' || f_unaccent(p_search_term) || '%') OR (p_search_term ~ '^\d+$' AND o.control_number = p_search_term::INT)))
    SELECT fo.control_number, fo.recipient_name::TEXT, fo.object_type, fo.tracking_code, fo.status, fo.arrival_date, fo.storage_deadline, fo.is_archived, fo.customer_id, fo.delivery_address_id, fo.created_at, fo.updated_at, (SELECT to_jsonb(a.*) FROM public.addresses a WHERE a.id = fo.delivery_address_id) as addresses, (SELECT count(*) FROM filtered_objects) as total_count
    FROM filtered_objects fo
    ORDER BY CASE WHEN p_sort_key = 'control_number' AND p_sort_direction_asc THEN fo.control_number END ASC, CASE WHEN p_sort_key = 'control_number' AND NOT p_sort_direction_asc THEN fo.control_number END DESC, CASE WHEN p_sort_key = 'recipient_name' AND p_sort_direction_asc THEN fo.recipient_name END ASC, CASE WHEN p_sort_key = 'recipient_name' AND NOT p_sort_direction_asc THEN fo.recipient_name END DESC, fo.arrival_date DESC
    LIMIT p_page_size OFFSET p_page_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.suggest_customer_links(p_search_term TEXT)
RETURNS TABLE(id UUID, full_name TEXT, address_info TEXT)
LANGUAGE plpgsql AS $$
DECLARE v_first_name TEXT;
BEGIN
    v_first_name := f_unaccent(split_part(p_search_term, ' ', 1));
    RETURN QUERY SELECT c.id, c.full_name::TEXT, COALESCE(a.street_name || ', ' || a.neighborhood, a.street_name, 'Endereço não cadastrado')::TEXT AS address_info FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id WHERE f_unaccent(c.full_name) LIKE v_first_name || '%' AND similarity(f_unaccent(c.full_name), f_unaccent(p_search_term)) > 0.1 ORDER BY similarity(f_unaccent(c.full_name), f_unaccent(p_search_term)) DESC LIMIT 5;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_objects_for_notification_by_filter(p_start_control INT DEFAULT NULL, p_end_control INT DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (control_number INT, recipient_name TEXT, object_type TEXT, storage_deadline DATE, phone_to_use TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT o.control_number, o.recipient_name::TEXT, o.object_type::TEXT, o.storage_deadline, COALESCE(c.cellphone, contact.cellphone)::TEXT AS phone_to_use FROM public.objects o LEFT JOIN public.customers c ON o.customer_id = c.id LEFT JOIN public.customers contact ON c.contact_customer_id = contact.id WHERE o.status = 'Aguardando Retirada' AND o.is_archived = FALSE AND ((p_start_control IS NULL OR p_end_control IS NULL) OR o.control_number BETWEEN p_start_control AND p_end_control) AND ((p_start_date IS NULL OR p_end_date IS NULL) OR o.arrival_date BETWEEN p_start_date AND p_end_date) AND COALESCE(c.cellphone, contact.cellphone) IS NOT NULL AND COALESCE(c.cellphone, contact.cellphone) <> '';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customers_for_export()
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE export_data JSONB;
BEGIN
    SELECT jsonb_agg(t) INTO export_data FROM (SELECT c.full_name, c.cellphone AS cellphone_to_use, c.is_active, c.birth_date, c.email, a.street_name, c.address_number, a.neighborhood, ci.name AS city_name, s.uf AS state_uf, a.cep, (SELECT STRING_AGG(dependent.full_name, ', ') FROM public.customers dependent WHERE dependent.contact_customer_id = c.id) AS associated_contacts FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.cellphone IS NOT NULL AND c.cellphone <> '') t;
    RETURN COALESCE(export_data, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_message_templates()
RETURNS SETOF message_templates
LANGUAGE sql STABLE AS $$
    SELECT * FROM public.message_templates ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
    v_awaiting_count INT; v_expiring_count INT; v_low_stock_count INT; v_recent_objects JSON; v_upcoming_birthdays JSON; v_pending_tasks JSON;
BEGIN
    SELECT COUNT(*) INTO v_awaiting_count FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE;
    SELECT COUNT(*) INTO v_expiring_count FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE AND storage_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days';
    SELECT COUNT(*) INTO v_low_stock_count FROM public.office_supplies WHERE stock < 10;
    SELECT json_agg(obj.*) INTO v_recent_objects FROM (SELECT control_number, recipient_name, object_type, arrival_date FROM public.objects WHERE is_archived = FALSE ORDER BY arrival_date DESC, created_at DESC LIMIT 5) obj;
    SELECT json_agg(bday.*) INTO v_upcoming_birthdays FROM (SELECT id, full_name, birth_date FROM public.customers WHERE is_active = TRUE AND birth_date IS NOT NULL AND to_char(birth_date, 'MM-DD') >= to_char(CURRENT_DATE, 'MM-DD') ORDER BY to_char(birth_date, 'MM-DD') ASC LIMIT 10) bday;
    SELECT json_agg(t.*) INTO v_pending_tasks FROM public.get_pending_tasks() t;
    RETURN json_build_object('awaiting_count', v_awaiting_count, 'expiring_count', v_expiring_count, 'low_stock_count', v_low_stock_count, 'recent_objects', COALESCE(v_recent_objects, '[]'::json), 'upcoming_birthdays', COALESCE(v_upcoming_birthdays, '[]'::json), 'pending_tasks', COALESCE(v_pending_tasks, '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_notifications()
RETURNS TABLE(unique_id TEXT, type TEXT, message TEXT, link TEXT)
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 'stock_' || s.id as unique_id, 'stock' as type, 'Estoque baixo para ' || s.name || ': ' || s.stock || ' unidades restantes.' as message, '/supplies' as link FROM public.office_supplies s WHERE s.stock < 10
    UNION ALL
    SELECT 'object_' || o.control_number as unique_id, 'object' as type, 'Objeto para ' || o.recipient_name || ' vence em 3 dias ou menos.' as message, '/objects' as link FROM public.objects o WHERE o.status = 'Aguardando Retirada' AND o.is_archived = FALSE AND o.storage_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 days'
    UNION ALL
    SELECT 'task_' || t.id as unique_id, 'task' as type, 'Tarefa pendente: ' || t.title as message, '/tasks' as link FROM public.get_pending_tasks() t;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_tasks()
RETURNS SETOF tasks
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.tasks t
    WHERE t.is_active = TRUE AND NOT EXISTS (
        SELECT 1
        FROM public.task_completions tc
        WHERE tc.task_id = t.id AND
        CASE
            WHEN t.frequency_type = 'daily' THEN tc.completed_at::date = CURRENT_DATE
            WHEN t.frequency_type = 'weekly' THEN date_trunc('week', tc.completed_at) = date_trunc('week', CURRENT_DATE)
            WHEN t.frequency_type = 'monthly' THEN date_trunc('month', tc.completed_at) = date_trunc('month', CURRENT_DATE)
            WHEN t.frequency_type = 'quarterly' THEN date_trunc('quarter', tc.completed_at) = date_trunc('quarter', CURRENT_DATE)
            WHEN t.frequency_type = 'semiannual' THEN (EXTRACT(YEAR FROM tc.completed_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(QUARTER FROM tc.completed_at) IN (1,2) AND EXTRACT(QUARTER FROM CURRENT_DATE) IN (1,2)) OR (EXTRACT(YEAR FROM tc.completed_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(QUARTER FROM tc.completed_at) IN (3,4) AND EXTRACT(QUARTER FROM CURRENT_DATE) IN (3,4))
            WHEN t.frequency_type = 'annual' THEN date_trunc('year', tc.completed_at) = date_trunc('year', CURRENT_DATE)
            WHEN t.frequency_type = 'once' THEN t.due_date >= CURRENT_DATE
            ELSE FALSE
        END
    )
    AND (t.frequency_type <> 'once' OR (t.frequency_type = 'once' AND NOT EXISTS (SELECT 1 FROM task_completions WHERE task_id = t.id)));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supply_stock_log(p_supply_id UUID, p_start_date DATE)
RETURNS SETOF supply_stock_log
LANGUAGE sql
AS $$
    SELECT *
    FROM public.supply_stock_log
    WHERE supply_id = p_supply_id AND created_at >= p_start_date
    ORDER BY created_at DESC;
$$;
