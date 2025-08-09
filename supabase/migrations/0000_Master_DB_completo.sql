-- path: supabase/migrations/0001_Estrutura_Final.sql
-- =============================================================================
-- || ARQUIVO 1: ESTRUTURA, TIPOS, EXTENSÕES E VIEWS                          ||
-- =============================================================================
-- DESCRIÇÃO: Cria a estrutura fundamental do banco de dados, incluindo tabelas,
-- tipos customizados, extensões do PostgreSQL e views de dados.

--------------------------------------------------------------------------------
-- 1. EXTENSÕES E FUNÇÕES BASE
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'public'
AS $function$
    SELECT public.unaccent('unaccent', $1);
$function$;

--------------------------------------------------------------------------------
-- 2. TABELAS
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.states (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, uf CHAR(2) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS public.cities (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, state_id INT NOT NULL REFERENCES public.states(id));
CREATE TABLE IF NOT EXISTS public.addresses (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), cep VARCHAR(9), street_name TEXT NOT NULL, neighborhood TEXT, city_id INT REFERENCES public.cities(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.customers (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), full_name TEXT NOT NULL, cpf VARCHAR(14) UNIQUE, cellphone VARCHAR(20) UNIQUE, email VARCHAR(255) UNIQUE, birth_date DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE, address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, address_number VARCHAR(20), address_complement VARCHAR(100), contact_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT chk_self_contact CHECK (id <> contact_customer_id));
CREATE TABLE IF NOT EXISTS public.employees (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name TEXT NOT NULL, registration_number VARCHAR(50) UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'employee', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.object_types (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, default_storage_days INT NOT NULL DEFAULT 20);
CREATE TABLE IF NOT EXISTS public.objects (control_number SERIAL PRIMARY KEY, recipient_name TEXT NOT NULL, customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, tracking_code VARCHAR(100), object_type VARCHAR(100) NOT NULL, arrival_date DATE NOT NULL DEFAULT CURRENT_DATE, storage_deadline DATE NOT NULL, status VARCHAR(50) DEFAULT 'Aguardando Retirada', is_archived BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), delivery_street_name TEXT, delivery_address_number TEXT, delivery_neighborhood TEXT, delivery_city_name TEXT, delivery_state_uf CHAR(2), delivery_cep VARCHAR(9));
CREATE TABLE IF NOT EXISTS public.office_supplies (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(150) UNIQUE NOT NULL, stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.supply_stock_log (id BIGSERIAL PRIMARY KEY, supply_id UUID NOT NULL REFERENCES public.office_supplies(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, quantity_changed INT NOT NULL, new_stock_total INT NOT NULL, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.user_themes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, theme_name VARCHAR(50) NOT NULL, theme_colors JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, theme_name));
CREATE TABLE IF NOT EXISTS public.tracking_code_rules (id SERIAL PRIMARY KEY, prefix VARCHAR(10) NOT NULL UNIQUE, object_type VARCHAR(100) NOT NULL, storage_days INT NOT NULL DEFAULT 7, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.bulk_import_reports (id BIGSERIAL PRIMARY KEY, report_data JSONB NOT NULL, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, label TEXT);
CREATE TABLE IF NOT EXISTS public.tasks (id SERIAL PRIMARY KEY, title TEXT NOT NULL UNIQUE, description TEXT, frequency_type TEXT NOT NULL, due_date DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.task_completions (id BIGSERIAL PRIMARY KEY, task_id INT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.system_links (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, url TEXT NOT NULL, description TEXT, details TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.message_templates (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL UNIQUE, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

-- Constraint de unicidade para endereços
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.addresses'::regclass AND conname = 'addresses_street_name_city_id_cep_key') THEN DELETE FROM public.addresses a WHERE a.id NOT IN ( SELECT id FROM ( SELECT id, ROW_NUMBER() OVER(PARTITION BY street_name, city_id, cep ORDER BY created_at) as rn FROM public.addresses ) t WHERE t.rn = 1 ); ALTER TABLE public.addresses ADD CONSTRAINT addresses_street_name_city_id_cep_key UNIQUE (street_name, city_id, cep); END IF; END; $$;

--------------------------------------------------------------------------------
-- 3. TIPOS CUSTOMIZADOS
--------------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_object_input') THEN
        CREATE TYPE simple_object_input AS (recipient_name TEXT, street_name TEXT);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registered_object_input') THEN
        CREATE TYPE registered_object_input AS ( tracking_code TEXT, recipient_name TEXT, street_name TEXT, address_number TEXT, address_complement TEXT, object_type TEXT );
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 4. VIEWS
--------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.addresses_with_customer_count AS
SELECT
  a.id,
  a.cep,
  a.street_name,
  a.neighborhood,
  a.city_id,
  c.name AS city_name,
  s.uf AS state_uf,
  a.created_at,
  a.updated_at,
  (
    SELECT count(*)
    FROM public.customers
    WHERE address_id = a.id
  ) AS customer_count
FROM
  public.addresses a
  LEFT JOIN public.cities c ON a.city_id = c.id
  LEFT JOIN public.states s ON c.state_id = s.id;

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

-- path: supabase/migrations/0004_Seed_Final.sql
-- =============================================================================
-- || ARQUIVO 4: DADOS INICIAIS (SEED)                                        ||
-- =============================================================================
-- DESCRIÇÃO: Insere os dados iniciais necessários para o funcionamento da
-- aplicação, como tipos de objetos, configurações e tarefas padrão.

-- Dados para a tabela de Tipos de Objeto
INSERT INTO public.object_types (name, default_storage_days) VALUES
    ('PAC', 7), ('SEDEX', 7), ('Carta Registrada', 20), ('Carta Simples', 20),
    ('Revista', 20), ('Cartão', 20), ('Telegrama', 7), ('Cartão Registrado', 20),
    ('Registrado', 7), ('Outro', 7)
ON CONFLICT (name) DO NOTHING;

-- Dados para a tabela de Configurações da Aplicação
INSERT INTO public.app_settings (key, value, description, label) VALUES
    ('agency_name', 'Correio de América Dourada', 'Nome da agência exibido no sistema.', 'Nome da Agência'),
    ('agency_dh', '10h05', 'Horario limite de postagem', 'Horario Limite'),
    ('agency_mcu', '00002678', 'MCU (Unidade de Correios) da Agência', 'MCU'),
    ('agency_sto', '08301026', 'STO (Setor de Triagem e Operações)', 'STO'),
    ('agency_address', 'Avenida Romão Gramacho, sn - Centro, América Dourada/BA', 'Endereço completo da agência', 'Endereço')
ON CONFLICT (key) DO NOTHING;

-- Dados para a tabela de Tarefas
INSERT INTO public.tasks (title, description, frequency_type) VALUES
    ('Verificar Caixa de E-mails', 'Responder e organizar os e-mails da agência.', 'daily'),
    ('Conferir Estoque Mínimo', 'Verificar se algum material de expediente precisa de ser reabastecido.', 'weekly'),
    ('Relatório Mensal de Objetos', 'Analisar o fluxo de objetos do último mês.', 'monthly')
ON CONFLICT (title) DO NOTHING;

-- Dados para a tabela de Modelos de Mensagem
INSERT INTO public.message_templates (name, content) VALUES
    ('Padrão - Chegada de Objeto', E'📢 A agência {{ENDERECO_AGENCIA}} informa!\n\nUm(a) {{TIPO_OBJETO}} está disponível para retirada em nome de:\n👤 *{{NOME_CLIENTE}}*\n\n⏳ Prazo para retirada: até {{DATA_PRAZO}}.\n🔑 Código para retirada: *{{NUMERO_CONTROLE}}*'),
    ('Aviso de Vencimento', E'Olá, {{NOME_CLIENTE}}! Passando para avisar que o seu {{TIPO_OBJETO}} está quase no fim do prazo de guarda.\n\nEle será devolvido no dia *{{DATA_PRAZO}}*.\n\nNão perca o prazo!'),
    ('Oferta - Tele Sena', E'Olá, {{NOME_CLIENTE}}! 🍀 A sorte está batendo na sua porta!\n\nQue tal aproveitar a retirada do seu objeto para garantir a sua Tele Sena da Sorte? Peça a sua no balcão!'),
    ('Informativo - Novo Serviço', E'Olá, {{NOME_CLIENTE}}! Temos uma novidade na agência {{NOME_DA_AGENCIA}}!\n\nAgora oferecemos [NOME DO NOVO SERVIÇO AQUI].\n\nVenha conferir na sua próxima visita!'),
    ('Final - Aviso de Remoção (PARE)', E'\n\n_(Se não quiser mais receber informações envie a palavra PARE e todo o seu cadastro será apagado ❌)_')
ON CONFLICT (name) DO NOTHING;


-- path: supabase/migrations/0005_Seguranca_Final.sql
-- =============================================================================
-- || ARQUIVO 5: SEGURANÇA (ROW LEVEL SECURITY)                               ||
-- =============================================================================
-- DESCRIÇÃO: Configura toda a Segurança a Nível de Linha (RLS), garantindo
-- que os usuários só possam acessar os dados que têm permissão.

--------------------------------------------------------------------------------
-- 1. FUNÇÃO HELPER DE ADMIN
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.employees WHERE id = p_user_id AND role = 'admin');
END;
$$;

--------------------------------------------------------------------------------
-- 2. ATIVAÇÃO DA RLS E CRIAÇÃO DAS POLÍTICAS
--------------------------------------------------------------------------------
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_stock_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_code_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename) || ';';
    END LOOP;
END $$;

CREATE POLICY "Allow read access to all authenticated users" ON public.states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can manage data" ON public.addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.office_supplies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.supply_stock_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.bulk_import_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.system_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage message templates" ON public.message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage their own themes" ON public.user_themes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employees can view their own data" ON public.employees FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage object types" ON public.object_types FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage tracking rules" ON public.tracking_code_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage task completions" ON public.task_completions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
