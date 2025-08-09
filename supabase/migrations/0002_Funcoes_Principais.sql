-- path: supabase/migrations/0003_Funcoes_Auxiliares_Final.sql
-- =============================================================================
-- || ARQUIVO 3: FUNÇÕES RPC - AUXILIARES E ADMIN                             ||
-- =============================================================================
-- DESCRIÇÃO: Contém as funções relacionadas a tarefas administrativas e
-- entidades secundárias, como Materiais, Tarefas, Links, etc.

--------------------------------------------------------------------------------
-- FUNÇÕES DE GESTÃO (ADMIN)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_employee(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    IF auth.uid() = p_user_id THEN RAISE EXCEPTION 'Um administrador não pode se auto-excluir.'; END IF;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_tracking_rule(p_object_type TEXT, p_prefix TEXT, p_rule_id INT, p_storage_days INT)
RETURNS tracking_code_rules LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_rule tracking_code_rules;
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    INSERT INTO public.tracking_code_rules (id, prefix, object_type, storage_days)
    VALUES (COALESCE(p_rule_id, nextval('tracking_code_rules_id_seq')), p_prefix, p_object_type, p_storage_days)
    ON CONFLICT (prefix) DO UPDATE SET object_type = EXCLUDED.object_type, storage_days = EXCLUDED.storage_days
    RETURNING * INTO result_rule;
    RETURN result_rule;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_or_update_app_setting(p_description TEXT, p_key TEXT, p_label TEXT, p_value TEXT)
RETURNS app_settings LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_setting app_settings;
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    INSERT INTO public.app_settings(key, value, description, label)
    VALUES (p_key, p_value, p_description, p_label)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, label = EXCLUDED.label
    RETURNING * INTO result_setting;
    RETURN result_setting;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_app_setting(p_key TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    DELETE FROM public.app_settings WHERE key = p_key;
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE MATERIAIS (SUPPLIES)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_supply(p_description TEXT, p_initial_stock INT, p_name VARCHAR, p_supply_id UUID)
RETURNS office_supplies LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_supply office_supplies;
BEGIN
    IF p_supply_id IS NULL THEN
        INSERT INTO public.office_supplies (name, description, stock) VALUES (p_name, p_description, p_initial_stock)
        RETURNING * INTO result_supply;
    ELSE
        UPDATE public.office_supplies SET name = p_name, description = p_description, updated_at = NOW()
        WHERE id = p_supply_id
        RETURNING * INTO result_supply;
    END IF;
    RETURN result_supply;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_and_adjust_stock(p_quantity_change INT, p_reason TEXT, p_supply_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_stock_total INT;
BEGIN
    UPDATE public.office_supplies SET stock = stock + p_quantity_change WHERE id = p_supply_id
    RETURNING stock INTO v_new_stock_total;
    INSERT INTO public.supply_stock_log (supply_id, user_id, quantity_changed, new_stock_total, reason)
    VALUES (p_supply_id, auth.uid(), p_quantity_change, v_new_stock_total, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.count_supplies(p_search_term TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE total_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.office_supplies
    WHERE p_search_term IS NULL OR name ILIKE ('%' || p_search_term || '%');
    RETURN total_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supply_stock_log(p_supply_id UUID, p_start_date DATE)
RETURNS SETOF supply_stock_log LANGUAGE sql AS $$
    SELECT * FROM public.supply_stock_log
    WHERE supply_id = p_supply_id AND created_at >= p_start_date
    ORDER BY created_at DESC;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE TAREFAS (TASKS)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_task(p_description TEXT, p_due_date DATE, p_frequency_type TEXT, p_task_id INT, p_title TEXT)
RETURNS tasks LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_task tasks;
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    IF p_task_id IS NULL THEN
        INSERT INTO public.tasks (title, description, frequency_type, due_date) VALUES (p_title, p_description, p_frequency_type, p_due_date)
        RETURNING * INTO result_task;
    ELSE
        UPDATE public.tasks SET title = p_title, description = p_description, frequency_type = p_frequency_type, due_date = p_due_date
        WHERE id = p_task_id
        RETURNING * INTO result_task;
    END IF;
    RETURN result_task;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_task(p_task_id INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    DELETE FROM public.tasks WHERE id = p_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_task(p_task_id INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.task_completions (task_id, user_id, completed_at)
    VALUES (p_task_id, auth.uid(), NOW());
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE LINKS DO SISTEMA
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_link(p_description TEXT, p_details TEXT, p_id UUID, p_name TEXT, p_url TEXT)
RETURNS system_links LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_link system_links;
BEGIN
    IF p_id IS NULL THEN
        INSERT INTO public.system_links (name, url, description, details) VALUES (p_name, p_url, p_description, p_details)
        RETURNING * INTO result_link;
    ELSE
        UPDATE public.system_links SET name = p_name, url = p_url, description = p_description, details = p_details, updated_at = NOW()
        WHERE id = p_id
        RETURNING * INTO result_link;
    END IF;
    RETURN result_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_link(p_link_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.system_links WHERE id = p_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_links(p_search_term TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE total_count INT;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.system_links
    WHERE p_search_term IS NULL OR p_search_term = '' OR (f_unaccent(name) ILIKE f_unaccent('%' || p_search_term || '%') OR f_unaccent(description) ILIKE f_unaccent('%' || p_search_term || '%'));
    RETURN total_count;
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE MODELOS DE MENSAGEM
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_or_update_message_template(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_or_update_message_template(id UUID, name TEXT, content TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF id IS NULL THEN
        INSERT INTO public.message_templates (name, content) VALUES (name, content);
    ELSE
        UPDATE public.message_templates
        SET name = create_or_update_message_template.name, content = create_or_update_message_template.content, updated_at = NOW()
        WHERE public.message_templates.id = create_or_update_message_template.id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_message_template(p_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.message_templates WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_message_templates()
RETURNS SETOF message_templates LANGUAGE sql STABLE AS $$
    SELECT * FROM public.message_templates ORDER BY name;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE TEMAS DE USUÁRIO
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_user_theme(p_theme_colors JSONB, p_theme_name TEXT)
RETURNS user_themes LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_theme user_themes;
BEGIN
    INSERT INTO public.user_themes (user_id, theme_name, theme_colors) VALUES (auth.uid(), p_theme_name, p_theme_colors)
    ON CONFLICT (user_id, theme_name) DO UPDATE SET theme_colors = EXCLUDED.theme_colors
    RETURNING * INTO result_theme;
    RETURN result_theme;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_theme(p_theme_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.user_themes WHERE id = p_theme_id AND user_id = auth.uid();
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE TIPOS DE OBJETO
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_object_type(p_default_storage_days INT, p_name TEXT, p_type_id INT)
RETURNS object_types LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_type object_types;
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    IF p_type_id IS NULL THEN
        INSERT INTO public.object_types (name, default_storage_days) VALUES (p_name, p_default_storage_days) RETURNING * INTO result_type;
    ELSE
        UPDATE public.object_types SET name = p_name, default_storage_days = p_default_storage_days WHERE id = p_type_id RETURNING * INTO result_type;
    END IF;
    RETURN result_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_object_type(p_type_id INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.'; END IF;
    DELETE FROM public.object_types WHERE id = p_type_id;
END;
$$;

--------------------------------------------------------------------------------
-- FUNÇÕES DE RELATÓRIOS E CONSULTAS GERAIS
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_paginated_objects(TEXT, BOOLEAN, TEXT, BOOLEAN, INT, INT);
CREATE OR REPLACE FUNCTION public.get_paginated_objects(p_search_term TEXT, p_show_archived BOOLEAN, p_sort_key TEXT, p_sort_direction_asc BOOLEAN, p_page_size INT, p_page_offset INT)
RETURNS TABLE (control_number INT, recipient_name TEXT, object_type VARCHAR(100), tracking_code VARCHAR(100), status VARCHAR(50), arrival_date DATE, storage_deadline DATE, is_archived BOOLEAN, customer_id UUID, delivery_street_name TEXT, delivery_address_number TEXT, delivery_neighborhood TEXT, delivery_city_name TEXT, delivery_state_uf CHAR(2), delivery_cep VARCHAR(9), customer_address JSONB, total_count BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    WITH filtered_objects AS (
        SELECT o.* FROM public.objects o WHERE o.is_archived = p_show_archived AND (p_search_term IS NULL OR p_search_term = '' OR f_unaccent(o.recipient_name) ILIKE '%' || f_unaccent(p_search_term) || '%' OR (o.tracking_code IS NOT NULL AND f_unaccent(o.tracking_code) ILIKE '%' || f_unaccent(p_search_term) || '%') OR (p_search_term ~ '^\d+$' AND o.control_number = p_search_term::INT))
    )
    SELECT fo.control_number, fo.recipient_name::TEXT, fo.object_type, fo.tracking_code, fo.status, fo.arrival_date, fo.storage_deadline, fo.is_archived, fo.customer_id, fo.delivery_street_name, fo.delivery_address_number, fo.delivery_neighborhood, fo.delivery_city_name, fo.delivery_state_uf, fo.delivery_cep,
        (SELECT jsonb_build_object('street_name', a.street_name, 'number', c.address_number, 'neighborhood', a.neighborhood, 'city_name', ci.name, 'state_uf', s.uf, 'cep', a.cep) FROM public.customers c JOIN public.addresses a ON c.address_id = a.id JOIN public.cities ci ON a.city_id = ci.id JOIN public.states s ON ci.state_id = s.id WHERE c.id = fo.customer_id) as customer_address,
        (SELECT count(*) FROM filtered_objects) as total_count
    FROM filtered_objects fo
    ORDER BY
        CASE WHEN p_sort_key = 'control_number' AND p_sort_direction_asc THEN fo.control_number END ASC, CASE WHEN p_sort_key = 'control_number' AND NOT p_sort_direction_asc THEN fo.control_number END DESC,
        CASE WHEN p_sort_key = 'recipient_name' AND p_sort_direction_asc THEN fo.recipient_name END ASC, CASE WHEN p_sort_key = 'recipient_name' AND NOT p_sort_direction_asc THEN fo.recipient_name END DESC,
        CASE WHEN p_sort_key = 'storage_deadline' AND p_sort_direction_asc THEN fo.storage_deadline END ASC, CASE WHEN p_sort_key = 'storage_deadline' AND NOT p_sort_direction_asc THEN fo.storage_deadline END DESC,
        fo.arrival_date DESC
    LIMIT p_page_size OFFSET p_page_offset;
END;
$$;

DROP FUNCTION IF EXISTS public.get_objects_for_notification_by_filter(INT, INT, DATE, DATE);
CREATE OR REPLACE FUNCTION public.get_objects_for_notification_by_filter(p_start_control INT DEFAULT NULL, p_end_control INT DEFAULT NULL, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (control_number INT, recipient_name TEXT, object_type TEXT, storage_deadline DATE, phone_to_use TEXT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT o.control_number, o.recipient_name::TEXT, o.object_type::TEXT, o.storage_deadline, COALESCE(c.cellphone, contact.cellphone)::TEXT AS phone_to_use
    FROM public.objects o
    JOIN public.customers c ON o.customer_id = c.id
    LEFT JOIN public.customers contact ON c.contact_customer_id = contact.id
    WHERE o.status = 'Aguardando Retirada' AND o.is_archived = FALSE
        AND ((p_start_control IS NULL OR p_end_control IS NULL) OR o.control_number BETWEEN p_start_control AND p_end_control)
        AND ((p_start_date IS NULL OR p_end_date IS NULL) OR o.arrival_date BETWEEN p_start_date AND p_end_date)
        AND ((c.is_active = TRUE AND c.cellphone IS NOT NULL AND c.cellphone <> '') OR ((c.cellphone IS NULL OR c.cellphone = '') AND c.contact_customer_id IS NOT NULL AND contact.is_active = TRUE AND contact.cellphone IS NOT NULL AND contact.cellphone <> ''));
END;
$$;

DROP FUNCTION IF EXISTS public.get_expiring_objects();
CREATE OR REPLACE FUNCTION public.get_expiring_objects()
RETURNS TABLE (recipient_name TEXT, object_type TEXT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT o.recipient_name::TEXT, o.object_type::TEXT
    FROM public.objects o
    WHERE o.status = 'Aguardando Retirada' AND o.is_archived = FALSE AND o.storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days')
    ORDER BY o.storage_deadline ASC, o.recipient_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_bulk_report(p_report_data JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.bulk_import_reports (report_data, user_id)
    VALUES (p_report_data, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customers_for_export()
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE export_data JSONB;
BEGIN
    SELECT jsonb_agg(t) INTO export_data FROM (SELECT c.full_name, c.cellphone AS cellphone_to_use, c.is_active, c.birth_date, c.email, a.street_name, c.address_number, a.neighborhood, ci.name AS city_name, s.uf AS state_uf, a.cep, (SELECT STRING_AGG(dependent.full_name, ', ') FROM public.customers dependent WHERE dependent.contact_customer_id = c.id) AS associated_contacts FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.cellphone IS NOT NULL AND c.cellphone <> '') t;
    RETURN COALESCE(export_data, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_data()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_awaiting_count INT; v_expiring_count INT; v_low_stock_count INT; v_recent_objects JSON; v_upcoming_birthdays JSON; v_pending_tasks JSON;
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
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
RETURNS SETOF tasks LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.tasks t
    WHERE t.is_active = TRUE AND NOT EXISTS (
        SELECT 1 FROM public.task_completions tc
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

CREATE OR REPLACE FUNCTION public.get_monthly_objects_report(p_year INT)
RETURNS TABLE (month_number TEXT, object_type TEXT, object_count BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT to_char(arrival_date, 'YYYY-MM') as month_number, o.object_type, count(*) as object_count
    FROM public.objects o WHERE extract(year from o.arrival_date) = p_year
    GROUP BY month_number, o.object_type
    ORDER BY month_number, o.object_type;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supplies_usage_report(p_year INT)
RETURNS TABLE (month_number TEXT, supply_name TEXT, total_used BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT to_char(sl.created_at, 'YYYY-MM') as month_number, s.name as supply_name, SUM(sl.quantity_changed * -1) as total_used
    FROM public.supply_stock_log sl JOIN public.office_supplies s ON sl.supply_id = s.id
    WHERE sl.quantity_changed < 0 AND extract(year from sl.created_at) = p_year
    GROUP BY month_number, s.name
    ORDER BY month_number, s.name;
END;
$$;

DROP FUNCTION IF EXISTS public.get_all_app_settings();
CREATE OR REPLACE FUNCTION public.get_all_app_settings()
RETURNS JSON
LANGUAGE plpgsql STABLE AS $$
DECLARE
    settings_json JSON;
BEGIN
    SELECT json_object_agg(key, value)
    INTO settings_json
    FROM public.app_settings;

    RETURN COALESCE(settings_json, '{}'::json);
END;
$$;
