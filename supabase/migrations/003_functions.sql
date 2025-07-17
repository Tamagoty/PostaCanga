-- Arquivo: supabase/migrations/003_functions.sql
-- Descrição: Script consolidado com todas as funções RPC finais da aplicação.

-- Função de Normalização de Texto
CREATE OR REPLACE FUNCTION normalize_text(p_text TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN trim(regexp_replace(lower(unaccent(p_text)), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funções de Gestão de Endereços
CREATE OR REPLACE FUNCTION create_or_update_address(p_address_id UUID, p_cep TEXT, p_street_name TEXT, p_neighborhood TEXT, p_city_id INT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_address_id UUID;
BEGIN
    IF p_address_id IS NOT NULL THEN
        UPDATE public.addresses SET cep=p_cep, street_name=p_street_name, neighborhood=p_neighborhood, city_id=p_city_id, updated_at=NOW()
        WHERE id = p_address_id RETURNING id INTO new_address_id;
    ELSE
        INSERT INTO public.addresses (cep, street_name, neighborhood, city_id)
        VALUES (p_cep, p_street_name, p_neighborhood, p_city_id) RETURNING id INTO new_address_id;
    END IF;
    RETURN new_address_id;
END;
$$;

CREATE OR REPLACE FUNCTION find_or_create_address_by_cep(p_cep TEXT, p_street_name TEXT, p_neighborhood TEXT, p_city_name TEXT, p_state_uf TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_address_id UUID; v_city_id INT;
BEGIN
    SELECT id INTO v_address_id FROM public.addresses WHERE cep = p_cep AND street_name = p_street_name LIMIT 1;
    IF v_address_id IS NOT NULL THEN RETURN v_address_id; END IF;
    SELECT c.id INTO v_city_id FROM public.cities c JOIN public.states s ON c.state_id = s.id WHERE c.name ILIKE p_city_name AND s.uf = p_state_uf LIMIT 1;
    IF v_city_id IS NULL THEN RAISE EXCEPTION 'Cidade ou Estado não encontrado: %, %', p_city_name, p_state_uf; END IF;
    INSERT INTO public.addresses (cep, street_name, neighborhood, city_id) VALUES (p_cep, p_street_name, p_neighborhood, v_city_id) RETURNING id INTO v_address_id;
    RETURN v_address_id;
END;
$$;

-- Funções de Gestão de Clientes
CREATE OR REPLACE FUNCTION create_or_update_customer(p_customer_id UUID, p_full_name TEXT, p_cpf TEXT, p_cellphone TEXT, p_birth_date DATE, p_contact_customer_id UUID, p_email TEXT, p_address_id UUID, p_address_number TEXT, p_address_complement TEXT)
RETURNS customers LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_customer customers;
BEGIN
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers SET full_name=p_full_name, cpf=p_cpf, cellphone=p_cellphone, birth_date=p_birth_date, contact_customer_id=p_contact_customer_id, email=p_email, address_id=p_address_id, address_number=p_address_number, address_complement=p_address_complement, updated_at=NOW()
        WHERE id = p_customer_id RETURNING * INTO result_customer;
    ELSE
        INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, contact_customer_id, email, address_id, address_number, address_complement)
        VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, p_contact_customer_id, p_email, p_address_id, p_address_number, p_address_complement)
        RETURNING * INTO result_customer;
    END IF;
    RETURN result_customer;
END;
$$;

CREATE OR REPLACE FUNCTION set_customer_status(p_customer_id UUID, p_is_active BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    WITH RECURSIVE customer_hierarchy AS (
        SELECT id FROM public.customers WHERE id = p_customer_id
        UNION ALL
        SELECT c.id FROM public.customers c INNER JOIN customer_hierarchy ch ON c.contact_customer_id = ch.id
    )
    UPDATE public.customers SET is_active = p_is_active WHERE id IN (SELECT id FROM customer_hierarchy);
END;
$$;

CREATE OR REPLACE FUNCTION count_customers_filtered(p_search_term TEXT, p_status_filter TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_count INT; query TEXT; search_pattern TEXT;
BEGIN
    query := 'SELECT COUNT(*) FROM public.customers WHERE TRUE';
    IF p_search_term IS NOT NULL AND p_search_term <> '' THEN
        search_pattern := '%' || p_search_term || '%';
        query := query || format(' AND (unaccent(full_name) ILIKE unaccent(%L) OR cpf ILIKE %L OR cellphone ILIKE %L)', search_pattern, search_pattern, search_pattern);
    END IF;
    IF p_status_filter = 'active' THEN query := query || ' AND is_active = TRUE';
    ELSIF p_status_filter = 'inactive' THEN query := query || ' AND is_active = FALSE';
    END IF;
    EXECUTE query INTO v_count;
    RETURN v_count;
END;
$$;

-- Funções de Gestão de Objetos
CREATE OR REPLACE FUNCTION create_or_update_object(p_recipient_name TEXT, p_object_type TEXT, p_tracking_code TEXT DEFAULT NULL, p_control_number INT DEFAULT NULL, p_cep TEXT DEFAULT NULL, p_street_name TEXT DEFAULT NULL, p_number TEXT DEFAULT NULL, p_neighborhood TEXT DEFAULT NULL, p_city_name TEXT DEFAULT NULL, p_state_uf TEXT DEFAULT NULL)
RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_customer_id UUID; v_address_id UUID; v_city_id INT; v_storage_deadline DATE; result_object objects;
BEGIN
    v_storage_deadline := CURRENT_DATE + CASE WHEN p_object_type IN ('SEDEX', 'Encomenda PAC', 'Telegrama', 'Outro') THEN INTERVAL '7 days' ELSE INTERVAL '20 days' END;
    SELECT id INTO v_customer_id FROM public.customers WHERE normalize_text(full_name) = normalize_text(p_recipient_name) LIMIT 1;
    IF p_street_name IS NOT NULL AND p_city_name IS NOT NULL THEN
        SELECT c.id INTO v_city_id FROM public.cities c JOIN public.states s ON c.state_id = s.id WHERE c.name ILIKE p_city_name AND s.uf ILIKE p_state_uf LIMIT 1;
        IF v_city_id IS NULL THEN RAISE EXCEPTION 'Cidade ou Estado não encontrado: %, %', p_city_name, p_state_uf; END IF;
        INSERT INTO public.addresses (cep, street_name, neighborhood, city_id) VALUES (p_cep, p_street_name, p_neighborhood, v_city_id) RETURNING id INTO v_address_id;
    ELSE v_address_id := NULL; END IF;
    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects SET recipient_name=p_recipient_name, object_type=p_object_type, tracking_code=p_tracking_code, customer_id=v_customer_id, updated_at=NOW() WHERE control_number = p_control_number RETURNING * INTO result_object;
    ELSE
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_address_id, arrival_date, status) VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, v_address_id, CURRENT_DATE, 'Aguardando Retirada') RETURNING * INTO result_object;
    END IF;
    RETURN result_object;
END;
$$;

CREATE OR REPLACE FUNCTION deliver_object(p_control_number INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN UPDATE public.objects SET status = 'Entregue', updated_at = NOW() WHERE control_number = p_control_number AND status = 'Aguardando Retirada'; END; $$;
CREATE OR REPLACE FUNCTION return_object(p_control_number INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN UPDATE public.objects SET status = 'Devolvido', updated_at = NOW() WHERE control_number = p_control_number AND status = 'Aguardando Retirada'; END; $$;
CREATE OR REPLACE FUNCTION archive_completed_objects() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; UPDATE public.objects SET is_archived = TRUE WHERE status IN ('Entregue', 'Devolvido') AND is_archived = FALSE; END; $$;
CREATE OR REPLACE FUNCTION unarchive_object(p_control_number INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; UPDATE public.objects SET status = 'Aguardando Retirada', is_archived = FALSE WHERE control_number = p_control_number; END; $$;

-- Funções de Gestão de Estoque
CREATE OR REPLACE FUNCTION create_or_update_supply(p_supply_id UUID, p_name TEXT, p_description TEXT, p_initial_stock INT DEFAULT 0)
RETURNS office_supplies LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_supply office_supplies;
BEGIN
    IF p_supply_id IS NOT NULL THEN
        UPDATE public.office_supplies SET name = p_name, description = p_description, updated_at = NOW() WHERE id = p_supply_id RETURNING * INTO result_supply;
    ELSE
        INSERT INTO public.office_supplies (name, description, stock) VALUES (p_name, p_description, p_initial_stock) RETURNING * INTO result_supply;
    END IF;
    RETURN result_supply;
END;
$$;

CREATE OR REPLACE FUNCTION log_and_adjust_stock(p_supply_id UUID, p_quantity_change INT, p_reason TEXT)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_stock INT;
BEGIN
    UPDATE public.office_supplies SET stock = stock + p_quantity_change WHERE id = p_supply_id AND stock + p_quantity_change >= 0 RETURNING stock INTO v_new_stock;
    IF NOT FOUND THEN RAISE EXCEPTION 'Falha ao atualizar o estoque. O resultado não pode ser negativo.'; END IF;
    INSERT INTO public.supply_stock_log (supply_id, user_id, quantity_changed, new_stock_total, reason) VALUES (p_supply_id, auth.uid(), p_quantity_change, v_new_stock, p_reason);
    RETURN v_new_stock;
END;
$$;

-- Funções de Gestão de Temas
CREATE OR REPLACE FUNCTION save_user_theme(p_theme_name TEXT, p_theme_colors JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN INSERT INTO public.user_themes (user_id, theme_name, theme_colors) VALUES (auth.uid(), p_theme_name, p_theme_colors) ON CONFLICT (user_id, theme_name) DO UPDATE SET theme_colors = EXCLUDED.theme_colors, created_at = NOW(); END; $$;
CREATE OR REPLACE FUNCTION delete_user_theme(p_theme_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM public.user_themes WHERE id = p_theme_id AND user_id = auth.uid(); END; $$;

-- Funções de Dashboard e Detalhes
CREATE OR REPLACE FUNCTION get_dashboard_data() RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_awaiting_objects_count INT; v_expiring_soon_count INT; v_low_stock_count INT; v_recent_objects JSON; v_upcoming_birthdays JSON;
BEGIN
    SELECT COUNT(*) INTO v_awaiting_objects_count FROM public.objects WHERE status = 'Aguardando Retirada';
    SELECT COUNT(*) INTO v_expiring_soon_count FROM public.objects WHERE status = 'Aguardando Retirada' AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days');
    SELECT COUNT(*) INTO v_low_stock_count FROM public.office_supplies WHERE stock <= 5;
    SELECT json_agg(t) INTO v_recent_objects FROM (SELECT control_number, recipient_name, object_type, arrival_date FROM public.objects ORDER BY arrival_date DESC, created_at DESC LIMIT 5) t;
    SELECT json_agg(b) INTO v_upcoming_birthdays FROM (SELECT id, full_name, birth_date, EXTRACT(DAY FROM birth_date) as birthday_day FROM public.customers WHERE is_active = TRUE AND birth_date IS NOT NULL AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) ORDER BY birthday_day) b;
    RETURN json_build_object('awaiting_count', v_awaiting_objects_count, 'expiring_count', v_expiring_soon_count, 'low_stock_count', v_low_stock_count, 'recent_objects', COALESCE(v_recent_objects, '[]'::json), 'upcoming_birthdays', COALESCE(v_upcoming_birthdays, '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_customer_profile JSON; v_customer_objects JSON;
BEGIN
    SELECT json_build_object('id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone, 'birth_date', c.birth_date, 'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id, 'email', c.email, 'address_id', c.address_id, 'address_number', c.address_number, 'address_complement', c.address_complement, 'address', json_build_object('street_name', a.street_name, 'neighborhood', a.neighborhood, 'cep', a.cep, 'city', ci.name, 'state', s.uf))
    INTO v_customer_profile FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.id = p_customer_id;
    SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o WHERE normalize_text(o.recipient_name) = normalize_text((SELECT full_name FROM public.customers WHERE id = p_customer_id));
    RETURN json_build_object('profile', v_customer_profile, 'objects', COALESCE(v_customer_objects, '[]'::json));
END;
$$;

CREATE OR REPLACE FUNCTION get_supply_stock_log(p_supply_id UUID, p_start_date DATE)
RETURNS TABLE (id BIGINT, quantity_changed INT, new_stock_total INT, reason TEXT, created_at TIMESTAMPTZ, operator_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    RETURN QUERY SELECT l.id, l.quantity_changed, l.new_stock_total, l.reason, l.created_at, e.full_name FROM public.supply_stock_log l LEFT JOIN public.employees e ON l.user_id = e.id WHERE l.supply_id = p_supply_id AND l.created_at >= p_start_date ORDER BY l.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_phones_for_recipients(p_recipient_names TEXT[])
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE v_name TEXT; v_phone TEXT; v_result JSONB := '{}'::jsonb; v_customer RECORD; v_contact_customer RECORD;
BEGIN
    FOREACH v_name IN ARRAY p_recipient_names LOOP
        v_phone := NULL;
        SELECT * INTO v_customer FROM public.customers WHERE normalize_text(full_name) = normalize_text(v_name) AND is_active = TRUE LIMIT 1;
        IF FOUND THEN
            IF v_customer.cellphone IS NOT NULL THEN v_phone := v_customer.cellphone;
            ELSIF v_customer.contact_customer_id IS NOT NULL THEN
                SELECT * INTO v_contact_customer FROM public.customers WHERE id = v_customer.contact_customer_id AND is_active = TRUE;
                IF FOUND AND v_contact_customer.cellphone IS NOT NULL THEN v_phone := v_contact_customer.cellphone; END IF;
            END IF;
        END IF;
        v_result := v_result || jsonb_build_object(v_name, v_phone);
    END LOOP;
    RETURN v_result;
END;
$$;
