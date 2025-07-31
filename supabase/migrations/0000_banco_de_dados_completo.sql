-- supabase/migrations/0000_banco_de_dados_completo.sql
-- Descrição: Script único e definitivo para inicializar todo o banco de dados do PostaCanga do zero.
-- Contém todas as tabelas, funções, gatilhos e políticas de segurança na sua versão mais recente.

--------------------------------------------------------------------------------
-- 1. EXTENSÕES E SCHEMA
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE TABLE IF NOT EXISTS public.states (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, uf CHAR(2) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS public.cities (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, state_id INT NOT NULL REFERENCES public.states(id));
CREATE TABLE IF NOT EXISTS public.addresses (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), cep VARCHAR(9), street_name TEXT NOT NULL, neighborhood TEXT, city_id INT REFERENCES public.cities(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(street_name, city_id, cep));
CREATE TABLE IF NOT EXISTS public.customers (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), full_name TEXT NOT NULL, cpf VARCHAR(14) UNIQUE, cellphone VARCHAR(20) UNIQUE, email VARCHAR(255) UNIQUE, birth_date DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE, address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, address_number VARCHAR(20), address_complement VARCHAR(100), contact_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT chk_self_contact CHECK (id <> contact_customer_id));
CREATE TABLE IF NOT EXISTS public.employees (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name TEXT NOT NULL, registration_number VARCHAR(50) UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'employee', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.object_types (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, default_storage_days INT NOT NULL DEFAULT 20);
CREATE TABLE IF NOT EXISTS public.objects (control_number SERIAL PRIMARY KEY, recipient_name TEXT NOT NULL, customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, tracking_code VARCHAR(100), object_type VARCHAR(100) NOT NULL, arrival_date DATE NOT NULL DEFAULT CURRENT_DATE, storage_deadline DATE NOT NULL, status VARCHAR(50) DEFAULT 'Aguardando Retirada', is_archived BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.office_supplies (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(150) UNIQUE NOT NULL, stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.supply_stock_log (id BIGSERIAL PRIMARY KEY, supply_id UUID NOT NULL REFERENCES public.office_supplies(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, quantity_changed INT NOT NULL, new_stock_total INT NOT NULL, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.user_themes (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, theme_name VARCHAR(50) NOT NULL, theme_colors JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, theme_name));
CREATE TABLE IF NOT EXISTS public.tracking_code_rules (id SERIAL PRIMARY KEY, prefix VARCHAR(10) NOT NULL UNIQUE, object_type VARCHAR(100) NOT NULL, storage_days INT NOT NULL DEFAULT 7, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.bulk_import_reports (id BIGSERIAL PRIMARY KEY, report_data JSONB NOT NULL, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, label TEXT);
CREATE TABLE IF NOT EXISTS public.tasks (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, frequency_type TEXT NOT NULL, due_date DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.task_completions (id BIGSERIAL PRIMARY KEY, task_id INT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.system_links (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, url TEXT NOT NULL, description TEXT, details TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());

-- Garante a restrição UNIQUE na tabela de tarefas para idempotência
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_title_unique') THEN
        DELETE FROM public.tasks a USING public.tasks b WHERE a.id > b.id AND a.title = b.title;
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_title_unique UNIQUE (title);
    END IF;
END;
$$;

--------------------------------------------------------------------------------
-- 2. DADOS INICIAIS E TIPOS
--------------------------------------------------------------------------------
INSERT INTO public.object_types (name, default_storage_days) VALUES
('PAC', 7), ('SEDEX', 7), ('Carta Registrada', 20), ('Carta Simples', 20), ('Revista', 20), ('Cartão', 20), ('Telegrama', 7), ('Cartão Registrado', 20), ('Registrado', 7), ('Outro', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.app_settings (key, value, description, label) VALUES
('agency_name', 'Correio de América Dourada', 'Nome da agência exibido no sistema.', 'Nome da Agência'),
('agency_dh', '10h05', 'Horario limite de postagem', 'Horario Limite'),
('agency_mcu', '00002678', 'MCU (Unidade de Correios) da Agência', 'MCU'),
('agency_sto', '08301026', 'STO (Setor de Triagem e Operações)', 'STO'),
('agency_address', 'Avenida Romão Gramacho, sn - Centro, América Dourada/BA', 'Endereço completo da agência', 'Endereço')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.tasks (title, description, frequency_type) VALUES
('Verificar Caixa de E-mails', 'Responder e organizar os e-mails da agência.', 'daily'),
('Conferir Estoque Mínimo', 'Verificar se algum material de expediente precisa de ser reabastecido.', 'weekly'),
('Relatório Mensal de Objetos', 'Analisar o fluxo de objetos do último mês.', 'monthly')
ON CONFLICT (title) DO NOTHING;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_object_input') THEN
        CREATE TYPE simple_object_input AS (recipient_name TEXT, street_name TEXT);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registered_object_input') THEN
        CREATE TYPE registered_object_input AS (
            tracking_code TEXT, recipient_name TEXT, street_name TEXT,
            address_number TEXT, address_complement TEXT, object_type TEXT
        );
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 3. FUNÇÕES E TRIGGERS
--------------------------------------------------------------------------------

-- Funções Auxiliares
DROP FUNCTION IF EXISTS normalize_text(TEXT);
CREATE OR REPLACE FUNCTION normalize_text(p_text TEXT) RETURNS TEXT AS $$ BEGIN RETURN trim(regexp_replace(lower(unaccent(p_text)), '\s+', ' ', 'g')); END; $$ LANGUAGE plpgsql IMMUTABLE;

DROP FUNCTION IF EXISTS proper_case(TEXT);
CREATE OR REPLACE FUNCTION proper_case(p_text TEXT) RETURNS TEXT AS $$ SELECT replace(replace(replace(replace(initcap(p_text), ' Dos ', ' dos '), ' Da ', ' da '), ' De ', ' de '), ' Do ', ' do ') $$ LANGUAGE sql IMMUTABLE;

DROP FUNCTION IF EXISTS get_my_role();
CREATE OR REPLACE FUNCTION get_my_role() RETURNS TEXT AS $$ BEGIN RETURN (SELECT role FROM public.employees WHERE id = auth.uid()); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funções de Gestão de Endereços
DROP FUNCTION IF EXISTS create_or_update_address(UUID,TEXT,TEXT,TEXT,INT);
CREATE OR REPLACE FUNCTION create_or_update_address(p_address_id UUID, p_cep TEXT, p_street_name TEXT, p_neighborhood TEXT, p_city_id INT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE new_address_id UUID; BEGIN IF p_address_id IS NOT NULL THEN UPDATE public.addresses SET cep=p_cep, street_name=p_street_name, neighborhood=p_neighborhood, city_id=p_city_id, updated_at=NOW() WHERE id = p_address_id RETURNING id INTO new_address_id; ELSE INSERT INTO public.addresses (cep, street_name, neighborhood, city_id) VALUES (p_cep, p_street_name, p_neighborhood, p_city_id) RETURNING id INTO new_address_id; END IF; RETURN new_address_id; END; $$;

DROP FUNCTION IF EXISTS delete_address(UUID);
CREATE OR REPLACE FUNCTION delete_address(p_address_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF EXISTS (SELECT 1 FROM public.customers WHERE address_id = p_address_id) THEN RAISE EXCEPTION 'Endereço em uso por um cliente.'; END IF; DELETE FROM public.addresses WHERE id = p_address_id; END; $$;

DROP FUNCTION IF EXISTS find_or_create_address_by_cep(TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION find_or_create_address_by_cep(p_cep TEXT, p_street_name TEXT, p_neighborhood TEXT, p_city_name TEXT, p_state_uf TEXT) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_address_id UUID; v_city_id INT; BEGIN SELECT id INTO v_address_id FROM public.addresses WHERE cep = p_cep AND street_name = p_street_name LIMIT 1; IF v_address_id IS NOT NULL THEN RETURN v_address_id; END IF; SELECT c.id INTO v_city_id FROM public.cities c JOIN public.states s ON c.state_id = s.id WHERE c.name ILIKE p_city_name AND s.uf = p_state_uf LIMIT 1; IF v_city_id IS NULL THEN RAISE EXCEPTION 'Cidade ou Estado não encontrado: %, %', p_city_name, p_state_uf; END IF; INSERT INTO public.addresses (cep, street_name, neighborhood, city_id) VALUES (p_cep, p_street_name, p_neighborhood, v_city_id) RETURNING id INTO v_address_id; RETURN v_address_id; END; $$;

DROP FUNCTION IF EXISTS count_addresses();
DROP FUNCTION IF EXISTS count_addresses(TEXT);
DROP FUNCTION IF EXISTS count_addresses(INT, TEXT);
CREATE OR REPLACE FUNCTION count_addresses(p_city_id INT DEFAULT NULL, p_search_term TEXT DEFAULT NULL) RETURNS INT LANGUAGE plpgsql AS $$ DECLARE v_count INT; v_query TEXT; BEGIN v_query := 'SELECT COUNT(*) FROM public.addresses WHERE TRUE'; IF p_city_id IS NOT NULL THEN v_query := v_query || ' AND city_id = ' || p_city_id; END IF; IF p_search_term IS NOT NULL AND p_search_term <> '' THEN v_query := v_query || format(' AND (street_name ILIKE %L OR neighborhood ILIKE %L OR cep ILIKE %L)', '%' || p_search_term || '%', '%' || p_search_term || '%', '%' || p_search_term || '%'); END IF; EXECUTE v_query INTO v_count; RETURN v_count; END; $$;

DROP FUNCTION IF EXISTS get_address_details_by_id(UUID);
CREATE OR REPLACE FUNCTION get_address_details_by_id(p_address_id UUID) RETURNS TABLE (street_name TEXT, city_name TEXT, state_uf TEXT) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY SELECT a.street_name, c.name AS city_name, s.uf AS state_uf FROM public.addresses a JOIN public.cities c ON a.city_id = c.id JOIN public.states s ON c.state_id = s.id WHERE a.id = p_address_id; END; $$;

DROP FUNCTION IF EXISTS get_neighborhoods_by_city(INT);
CREATE OR REPLACE FUNCTION get_neighborhoods_by_city(p_city_id INT) RETURNS TABLE (neighborhood TEXT) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY SELECT DISTINCT a.neighborhood::TEXT FROM public.addresses a WHERE a.city_id = p_city_id AND a.neighborhood IS NOT NULL AND a.neighborhood <> '' ORDER BY a.neighborhood::TEXT; END; $$;

-- Funções de Gestão de Clientes
DROP FUNCTION IF EXISTS create_or_update_customer(UUID,TEXT,TEXT,TEXT,DATE,UUID,TEXT,UUID,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_customer(p_customer_id UUID, p_full_name TEXT, p_cpf TEXT, p_cellphone TEXT, p_birth_date DATE, p_contact_customer_id UUID, p_email TEXT, p_address_id UUID, p_address_number TEXT, p_address_complement TEXT) RETURNS customers LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE result_customer customers; BEGIN IF p_customer_id IS NOT NULL THEN UPDATE public.customers SET full_name=p_full_name, cpf=p_cpf, cellphone=p_cellphone, birth_date=p_birth_date, contact_customer_id=p_contact_customer_id, email=p_email, address_id=p_address_id, address_number=p_address_number, address_complement=p_address_complement, updated_at=NOW() WHERE id = p_customer_id RETURNING * INTO result_customer; ELSE INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, contact_customer_id, email, address_id, address_number, address_complement) VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, p_contact_customer_id, p_email, p_address_id, p_address_number, p_address_complement) RETURNING * INTO result_customer; END IF; RETURN result_customer; END; $$;

DROP FUNCTION IF EXISTS set_customer_status(UUID,BOOLEAN);
CREATE OR REPLACE FUNCTION set_customer_status(p_customer_id UUID, p_is_active BOOLEAN) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN WITH RECURSIVE customer_hierarchy AS (SELECT id FROM public.customers WHERE id = p_customer_id UNION ALL SELECT c.id FROM public.customers c INNER JOIN customer_hierarchy ch ON c.contact_customer_id = ch.id) UPDATE public.customers SET is_active = p_is_active WHERE id IN (SELECT id FROM customer_hierarchy); END; $$;

DROP FUNCTION IF EXISTS count_customers_filtered(TEXT,TEXT);
CREATE OR REPLACE FUNCTION count_customers_filtered(p_search_term TEXT, p_status_filter TEXT) RETURNS INT LANGUAGE plpgsql AS $$ DECLARE v_count INT; v_query TEXT; v_search_pattern TEXT; v_cleaned_search_term TEXT; BEGIN v_query := 'SELECT COUNT(*) FROM public.customers WHERE TRUE'; IF p_search_term IS NOT NULL AND p_search_term <> '' THEN v_search_pattern := '%' || p_search_term || '%'; v_cleaned_search_term := regexp_replace(p_search_term, '[^0-9]', '', 'g'); v_cleaned_search_term := '%' || v_cleaned_search_term || '%'; v_query := v_query || format(' AND (unaccent(full_name) ILIKE unaccent(%L) OR regexp_replace(cpf, ''[^0-9]'', '''', ''g'') ILIKE %L OR regexp_replace(cellphone, ''[^0-9]'', '''', ''g'') ILIKE %L)', v_search_pattern, v_cleaned_search_term, v_cleaned_search_term); END IF; IF p_status_filter = 'active' THEN v_query := v_query || ' AND is_active = TRUE'; ELSIF p_status_filter = 'inactive' THEN v_query := v_query || ' AND is_active = FALSE'; END IF; EXECUTE v_query INTO v_count; RETURN v_count; END; $$;

DROP FUNCTION IF EXISTS search_contacts(TEXT);
CREATE OR REPLACE FUNCTION search_contacts(p_search_term TEXT) RETURNS TABLE (id UUID, full_name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY SELECT c.id, c.full_name FROM public.customers c WHERE c.is_active = TRUE AND c.cellphone IS NOT NULL AND normalize_text(c.full_name) ILIKE normalize_text('%' || p_search_term || '%') ORDER BY c.full_name LIMIT 20; END; $$;

DROP FUNCTION IF EXISTS public.get_paginated_customers_with_details(text, text, integer, integer);
CREATE OR REPLACE FUNCTION get_paginated_customers_with_details(p_search_term TEXT, p_status_filter TEXT, p_offset INT, p_limit INT) RETURNS JSON LANGUAGE plpgsql AS $$ DECLARE v_results JSON; v_query TEXT; v_search_pattern TEXT; v_cleaned_search_term TEXT; BEGIN v_query := ' SELECT json_agg(t) FROM ( SELECT c.*, ( SELECT row_to_json(a_sub) FROM ( SELECT ad.street_name, ( SELECT row_to_json(ci_sub) FROM ( SELECT ci.name, (SELECT row_to_json(s_sub) FROM (SELECT s.uf) AS s_sub) AS state FROM public.cities ci LEFT JOIN public.states s ON ci.state_id = s.id WHERE ci.id = ad.city_id ) AS ci_sub ) AS city FROM public.addresses ad WHERE ad.id = c.address_id ) AS a_sub ) AS addresses, ( SELECT row_to_json(con_sub) FROM ( SELECT con.full_name, con.cellphone FROM public.customers con WHERE con.id = c.contact_customer_id ) AS con_sub ) AS contact FROM public.customers c WHERE TRUE'; IF p_search_term IS NOT NULL AND p_search_term <> '' THEN v_search_pattern := '%' || p_search_term || '%'; v_cleaned_search_term := regexp_replace(p_search_term, '[^0-9]', '', 'g'); v_query := v_query || format(' AND (unaccent(c.full_name) ILIKE unaccent(%L)', v_search_pattern); IF v_cleaned_search_term <> '' THEN v_cleaned_search_term := '%' || v_cleaned_search_term || '%'; v_query := v_query || format(' OR regexp_replace(c.cpf, ''[^0-9]'', '''', ''g'') ILIKE %L OR regexp_replace(c.cellphone, ''[^0-9]'', '''', ''g'') ILIKE %L', v_cleaned_search_term, v_cleaned_search_term); END IF; v_query := v_query || ')'; END IF; IF p_status_filter = 'active' THEN v_query := v_query || ' AND c.is_active = TRUE'; ELSIF p_status_filter = 'inactive' THEN v_query := v_query || ' AND c.is_active = FALSE'; END IF; v_query := v_query || ' ORDER BY c.full_name ASC LIMIT ' || p_limit || ' OFFSET ' || p_offset; v_query := v_query || ') t'; EXECUTE v_query INTO v_results; RETURN COALESCE(v_results, '[]'::json); END; $$;

-- Funções de Gestão de Objetos
DROP FUNCTION IF EXISTS create_or_update_object(TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_object(p_recipient_name TEXT, p_object_type TEXT, p_tracking_code TEXT DEFAULT NULL, p_control_number INT DEFAULT NULL, p_cep TEXT DEFAULT NULL, p_street_name TEXT DEFAULT NULL, p_number TEXT DEFAULT NULL, p_neighborhood TEXT DEFAULT NULL, p_city_name TEXT DEFAULT NULL, p_state_uf TEXT DEFAULT NULL) RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_customer_id UUID; v_address_id UUID; v_city_id INT; v_storage_deadline DATE; v_storage_days INT; result_object objects; BEGIN IF NOT EXISTS (SELECT 1 FROM public.object_types WHERE name = p_object_type) THEN RAISE EXCEPTION 'O tipo de objeto "%" não é válido.', p_object_type; END IF; SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type; v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL; SELECT id INTO v_customer_id FROM public.customers WHERE normalize_text(full_name) = normalize_text(p_recipient_name) LIMIT 1; IF p_street_name IS NOT NULL AND p_city_name IS NOT NULL THEN SELECT c.id INTO v_city_id FROM public.cities c JOIN public.states s ON c.state_id = s.id WHERE c.name ILIKE p_city_name AND s.uf ILIKE p_state_uf LIMIT 1; IF v_city_id IS NULL THEN RAISE EXCEPTION 'Cidade ou Estado não encontrado: %, %', p_city_name, p_state_uf; END IF; INSERT INTO public.addresses (cep, street_name, neighborhood, city_id) VALUES (p_cep, p_street_name, p_neighborhood, v_city_id) ON CONFLICT (street_name, city_id, cep) DO NOTHING; SELECT id INTO v_address_id FROM public.addresses WHERE street_name=p_street_name AND city_id=v_city_id; ELSE v_address_id := NULL; END IF; IF p_control_number IS NOT NULL THEN UPDATE public.objects SET recipient_name=p_recipient_name, object_type=p_object_type, tracking_code=p_tracking_code, customer_id=v_customer_id, updated_at=NOW() WHERE control_number = p_control_number RETURNING * INTO result_object; ELSE INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_address_id) VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, v_address_id) RETURNING * INTO result_object; END IF; RETURN result_object; END; $$;

DROP FUNCTION IF EXISTS deliver_object(INT);
CREATE OR REPLACE FUNCTION deliver_object(p_control_number INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.objects SET status = 'Entregue', updated_at = NOW() WHERE control_number = p_control_number AND status = 'Aguardando Retirada'; END; $$;

DROP FUNCTION IF EXISTS return_object(INT);
CREATE OR REPLACE FUNCTION return_object(p_control_number INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.objects SET status = 'Devolvido', updated_at = NOW() WHERE control_number = p_control_number AND status = 'Aguardando Retirada'; END; $$;

DROP FUNCTION IF EXISTS archive_completed_objects();
CREATE OR REPLACE FUNCTION archive_completed_objects() RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; UPDATE public.objects SET is_archived = TRUE WHERE status IN ('Entregue', 'Devolvido') AND is_archived = FALSE; END; $$;

DROP FUNCTION IF EXISTS unarchive_object(INT);
CREATE OR REPLACE FUNCTION unarchive_object(p_control_number INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; UPDATE public.objects SET status = 'Aguardando Retirada', is_archived = FALSE WHERE control_number = p_control_number; END; $$;

-- Funções de Inserção em Massa
DROP FUNCTION IF EXISTS bulk_create_simple_objects(TEXT,simple_object_input[]);
CREATE OR REPLACE FUNCTION bulk_create_simple_objects(p_object_type TEXT, p_objects simple_object_input[]) RETURNS TABLE (report_recipient_name TEXT, report_control_number INT) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE obj simple_object_input; v_recipient_name TEXT; v_street_name TEXT; v_address_id UUID; v_city_id INT; v_customer_id UUID; v_storage_deadline DATE; v_new_control_number INT; v_storage_days INT; BEGIN SELECT id INTO v_city_id FROM cities WHERE name = 'América Dourada' LIMIT 1; IF v_city_id IS NULL THEN RAISE EXCEPTION 'A cidade padrão "América Dourada" não foi encontrada.'; END IF; SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type; IF NOT FOUND THEN v_storage_days := 20; END IF; v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL; FOREACH obj IN ARRAY p_objects LOOP v_recipient_name := proper_case(obj.recipient_name); v_street_name := proper_case(obj.street_name); SELECT id INTO v_address_id FROM addresses WHERE normalize_text(street_name) = normalize_text(v_street_name) AND city_id = v_city_id LIMIT 1; IF v_address_id IS NULL THEN INSERT INTO addresses (street_name, city_id) VALUES (v_street_name, v_city_id) RETURNING id INTO v_address_id; END IF; SELECT id INTO v_customer_id FROM customers WHERE normalize_text(full_name) = normalize_text(v_recipient_name) LIMIT 1; INSERT INTO public.objects (recipient_name, object_type, storage_deadline, customer_id, delivery_address_id) VALUES (v_recipient_name, p_object_type, v_storage_deadline, v_customer_id, v_address_id) RETURNING control_number INTO v_new_control_number; report_recipient_name := v_recipient_name; report_control_number := v_new_control_number; RETURN NEXT; END LOOP; RETURN; END; $$;

DROP FUNCTION IF EXISTS bulk_create_registered_objects(registered_object_input[]);
CREATE OR REPLACE FUNCTION bulk_create_registered_objects(p_objects registered_object_input[]) RETURNS TABLE (report_recipient_name TEXT, report_control_number INT, report_tracking_code TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE obj registered_object_input; v_rule RECORD; v_recipient_name TEXT; v_street_name TEXT; v_address_number TEXT; v_address_complement TEXT; v_address_id UUID; v_city_id INT; v_customer_id UUID; v_storage_deadline DATE; v_new_control_number INT; BEGIN SELECT id INTO v_city_id FROM cities WHERE name = 'América Dourada' LIMIT 1; IF v_city_id IS NULL THEN RAISE EXCEPTION 'A cidade padrão "América Dourada" não foi encontrada.'; END IF; FOREACH obj IN ARRAY p_objects LOOP SELECT * INTO v_rule FROM public.tracking_code_rules WHERE upper(obj.tracking_code) LIKE upper(prefix) || '%'; IF NOT FOUND THEN v_storage_deadline := CURRENT_DATE + INTERVAL '7 days'; ELSE v_storage_deadline := CURRENT_DATE + (v_rule.storage_days || ' days')::INTERVAL; END IF; v_recipient_name := proper_case(obj.recipient_name); v_street_name := proper_case(obj.street_name); v_address_number := obj.address_number; v_address_complement := obj.address_complement; SELECT id INTO v_address_id FROM addresses WHERE normalize_text(street_name) = normalize_text(v_street_name) AND city_id = v_city_id LIMIT 1; IF v_address_id IS NULL THEN INSERT INTO addresses (street_name, city_id) VALUES (v_street_name, v_city_id) RETURNING id INTO v_address_id; END IF; SELECT id INTO v_customer_id FROM customers WHERE normalize_text(full_name) = normalize_text(v_recipient_name) LIMIT 1; IF v_customer_id IS NULL THEN INSERT INTO public.customers (full_name, address_id, address_number, address_complement) VALUES (v_recipient_name, v_address_id, v_address_number, v_address_complement) RETURNING id INTO v_customer_id; ELSE UPDATE public.customers SET address_id = v_address_id, address_number = v_address_number, address_complement = v_address_complement WHERE id = v_customer_id; END IF; INSERT INTO public.objects (recipient_name, object_type, tracking_code, storage_deadline, customer_id, delivery_address_id) VALUES (v_recipient_name, obj.object_type, upper(obj.tracking_code), v_storage_deadline, v_customer_id, v_address_id) RETURNING control_number INTO v_new_control_number; report_recipient_name := v_recipient_name; report_control_number := v_new_control_number; report_tracking_code := upper(obj.tracking_code); RETURN NEXT; END LOOP; RETURN; END; $$;

-- Funções de Gestão de Estoque
DROP FUNCTION IF EXISTS create_or_update_supply(UUID,TEXT,TEXT,INT);
CREATE OR REPLACE FUNCTION create_or_update_supply(p_supply_id UUID, p_name TEXT, p_description TEXT, p_initial_stock INT DEFAULT 0) RETURNS office_supplies LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE result_supply office_supplies; BEGIN IF p_supply_id IS NOT NULL THEN UPDATE public.office_supplies SET name = p_name, description = p_description, updated_at = NOW() WHERE id = p_supply_id RETURNING * INTO result_supply; ELSE INSERT INTO public.office_supplies (name, description, stock) VALUES (p_name, p_description, p_initial_stock) RETURNING * INTO result_supply; END IF; RETURN result_supply; END; $$;

DROP FUNCTION IF EXISTS log_and_adjust_stock(UUID,INT,TEXT);
CREATE OR REPLACE FUNCTION log_and_adjust_stock(p_supply_id UUID, p_quantity_change INT, p_reason TEXT) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_new_stock INT; BEGIN UPDATE public.office_supplies SET stock = stock + p_quantity_change WHERE id = p_supply_id AND stock + p_quantity_change >= 0 RETURNING stock INTO v_new_stock; IF NOT FOUND THEN RAISE EXCEPTION 'Falha ao atualizar o estoque. O resultado não pode ser negativo.'; END IF; INSERT INTO public.supply_stock_log (supply_id, user_id, quantity_changed, new_stock_total, reason) VALUES (p_supply_id, auth.uid(), p_quantity_change, v_new_stock, p_reason); RETURN v_new_stock; END; $$;

DROP FUNCTION IF EXISTS count_supplies(TEXT);
CREATE OR REPLACE FUNCTION count_supplies(p_search_term TEXT DEFAULT NULL) RETURNS INT LANGUAGE plpgsql AS $$ DECLARE v_count INT; v_query TEXT; BEGIN v_query := 'SELECT COUNT(*) FROM public.office_supplies'; IF p_search_term IS NOT NULL AND p_search_term <> '' THEN v_query := v_query || format(' WHERE name ILIKE %L', '%' || p_search_term || '%'); END IF; EXECUTE v_query INTO v_count; RETURN v_count; END; $$;

-- Funções de Gestão de Links
DROP FUNCTION IF EXISTS create_or_update_link(UUID,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_link(p_link_id UUID, p_name TEXT, p_url TEXT, p_description TEXT, p_details TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF p_link_id IS NOT NULL THEN UPDATE public.system_links SET name = p_name, url = p_url, description = p_description, details = p_details, updated_at = NOW() WHERE id = p_link_id; ELSE INSERT INTO public.system_links (name, url, description, details) VALUES (p_name, p_url, p_description, p_details); END IF; END; $$;

DROP FUNCTION IF EXISTS delete_link(UUID);
CREATE OR REPLACE FUNCTION delete_link(p_link_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN DELETE FROM public.system_links WHERE id = p_link_id; END; $$;

DROP FUNCTION IF EXISTS count_links(TEXT);
CREATE OR REPLACE FUNCTION count_links(p_search_term TEXT DEFAULT NULL) RETURNS INT LANGUAGE plpgsql AS $$ DECLARE v_count INT; v_query TEXT; BEGIN v_query := 'SELECT COUNT(*) FROM public.system_links'; IF p_search_term IS NOT NULL AND p_search_term <> '' THEN v_query := v_query || format(' WHERE name ILIKE %L OR description ILIKE %L', '%' || p_search_term || '%', '%' || p_search_term || '%'); END IF; EXECUTE v_query INTO v_count; RETURN v_count; END; $$;

-- Funções de Gestão de Temas e Configurações
DROP FUNCTION IF EXISTS save_user_theme(TEXT,JSONB);
CREATE OR REPLACE FUNCTION save_user_theme(p_theme_name TEXT, p_theme_colors JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.user_themes (user_id, theme_name, theme_colors) VALUES (auth.uid(), p_theme_name, p_theme_colors) ON CONFLICT (user_id, theme_name) DO UPDATE SET theme_colors = EXCLUDED.theme_colors, created_at = NOW(); END; $$;

DROP FUNCTION IF EXISTS delete_user_theme(UUID);
CREATE OR REPLACE FUNCTION delete_user_theme(p_theme_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN DELETE FROM public.user_themes WHERE id = p_theme_id AND user_id = auth.uid(); END; $$;

DROP FUNCTION IF EXISTS create_or_update_app_setting(TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_app_setting(p_key TEXT, p_value TEXT, p_description TEXT, p_label TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; INSERT INTO public.app_settings (key, value, description, label) VALUES (p_key, p_value, p_description, p_label) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, label = EXCLUDED.label; END; $$;

DROP FUNCTION IF EXISTS delete_app_setting(TEXT);
CREATE OR REPLACE FUNCTION delete_app_setting(p_key TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; IF p_key IN ('agency_name', 'agency_dh', 'agency_mcu', 'agency_sto', 'agency_address') THEN RAISE EXCEPTION 'Esta configuração não pode ser apagada.'; END IF; DELETE FROM public.app_settings WHERE key = p_key; END; $$;

-- Funções de Gestão de Funcionários
DROP FUNCTION IF EXISTS get_employee_profiles();
CREATE OR REPLACE FUNCTION get_employee_profiles() RETURNS TABLE (id UUID, full_name TEXT, registration_number VARCHAR, role TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem visualizar perfis.'; END IF; RETURN QUERY SELECT e.id, e.full_name, e.registration_number, e.role FROM public.employees e; END; $$;

DROP FUNCTION IF EXISTS delete_employee(UUID);
CREATE OR REPLACE FUNCTION delete_employee(p_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem apagar usuários.'; END IF; DELETE FROM auth.users WHERE id = p_user_id; END; $$;

-- Funções de Gestão de Regras e Tipos
DROP FUNCTION IF EXISTS create_or_update_tracking_rule(INT,TEXT,TEXT,INT);
CREATE OR REPLACE FUNCTION create_or_update_tracking_rule(p_rule_id INT, p_prefix TEXT, p_object_type TEXT, p_storage_days INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; IF p_rule_id IS NOT NULL THEN UPDATE public.tracking_code_rules SET prefix=p_prefix, object_type=p_object_type, storage_days=p_storage_days WHERE id = p_rule_id; ELSE INSERT INTO public.tracking_code_rules (prefix, object_type, storage_days) VALUES (p_prefix, p_object_type, p_storage_days); END IF; END; $$;

DROP FUNCTION IF EXISTS delete_tracking_rule(INT);
CREATE OR REPLACE FUNCTION delete_tracking_rule(p_rule_id INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; DELETE FROM public.tracking_code_rules WHERE id = p_rule_id; END; $$;

DROP FUNCTION IF EXISTS create_or_update_object_type(INT,TEXT,INT);
CREATE OR REPLACE FUNCTION create_or_update_object_type(p_type_id INT, p_name TEXT, p_default_storage_days INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; IF p_type_id IS NOT NULL THEN UPDATE public.object_types SET name=p_name, default_storage_days=p_default_storage_days WHERE id = p_type_id; ELSE INSERT INTO public.object_types (name, default_storage_days) VALUES (p_name, p_default_storage_days); END IF; END; $$;

DROP FUNCTION IF EXISTS delete_object_type(INT);
CREATE OR REPLACE FUNCTION delete_object_type(p_type_id INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; DELETE FROM public.object_types WHERE id = p_type_id; END; $$;

-- Funções de Gestão de Tarefas
DROP FUNCTION IF EXISTS create_or_update_task(INT,TEXT,TEXT,TEXT,DATE);
CREATE OR REPLACE FUNCTION create_or_update_task(p_task_id INT, p_title TEXT, p_description TEXT, p_frequency_type TEXT, p_due_date DATE DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; IF p_task_id IS NOT NULL THEN UPDATE public.tasks SET title = p_title, description = p_description, frequency_type = p_frequency_type, due_date = p_due_date WHERE id = p_task_id; ELSE INSERT INTO public.tasks (title, description, frequency_type, due_date) VALUES (p_title, p_description, p_frequency_type, p_due_date); END IF; END; $$;

DROP FUNCTION IF EXISTS delete_task(INT);
CREATE OR REPLACE FUNCTION delete_task(p_task_id INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF get_my_role() <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF; DELETE FROM public.task_completions WHERE task_id = p_task_id; DELETE FROM public.tasks WHERE id = p_task_id; END; $$;

DROP FUNCTION IF EXISTS complete_task(INT);
CREATE OR REPLACE FUNCTION complete_task(p_task_id INT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.task_completions (task_id, user_id) VALUES (p_task_id, auth.uid()); END; $$;

-- Funções de Consulta e Relatórios
DROP FUNCTION IF EXISTS get_pending_tasks();
CREATE OR REPLACE FUNCTION get_pending_tasks() RETURNS TABLE (id INT, title TEXT, description TEXT, frequency_type TEXT, due_date DATE, last_completed_at TIMESTAMPTZ) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY SELECT t.id, t.title, t.description, t.frequency_type, t.due_date, (SELECT MAX(tc.completed_at) FROM task_completions tc WHERE tc.task_id = t.id) AS last_completed_at FROM public.tasks t WHERE t.is_active = TRUE AND ((t.frequency_type = 'daily' AND EXTRACT(ISODOW FROM CURRENT_DATE) BETWEEN 1 AND 5 AND NOT EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id AND tc.completed_at::date = CURRENT_DATE)) OR (t.frequency_type = 'weekly' AND ((SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) < NOW() - INTERVAL '7 days')) OR (t.frequency_type = 'monthly' AND ((SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR (EXTRACT(YEAR FROM (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id)) * 12 + EXTRACT(MONTH FROM (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id))) < (EXTRACT(YEAR FROM CURRENT_DATE) * 12 + EXTRACT(MONTH FROM CURRENT_DATE)))) OR (t.frequency_type = 'quarterly' AND ((SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) < NOW() - INTERVAL '3 months')) OR (t.frequency_type = 'semiannual' AND ((SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) < NOW() - INTERVAL '6 months')) OR (t.frequency_type = 'annual' AND ((SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) < NOW() - INTERVAL '1 year')) OR (t.frequency_type = 'once' AND t.due_date >= CURRENT_DATE AND NOT EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id))) ORDER BY t.frequency_type, t.title; END; $$;

DROP FUNCTION IF EXISTS get_dashboard_data();
CREATE OR REPLACE FUNCTION get_dashboard_data() RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_awaiting_objects_count INT; v_expiring_soon_count INT; v_low_stock_count INT; v_recent_objects JSON; v_upcoming_birthdays JSON; v_pending_tasks JSON; BEGIN SELECT COUNT(*) INTO v_awaiting_objects_count FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE; SELECT COUNT(*) INTO v_expiring_soon_count FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days'); SELECT COUNT(*) INTO v_low_stock_count FROM public.office_supplies WHERE stock <= 5; SELECT json_agg(t) INTO v_recent_objects FROM (SELECT control_number, recipient_name, object_type, arrival_date FROM public.objects ORDER BY arrival_date DESC, created_at DESC LIMIT 5) t; SELECT json_agg(b) INTO v_upcoming_birthdays FROM (SELECT id, full_name, birth_date FROM public.customers WHERE is_active = TRUE AND birth_date IS NOT NULL) b; SELECT json_agg(pt.*) INTO v_pending_tasks FROM get_pending_tasks() pt; RETURN json_build_object('awaiting_count', v_awaiting_objects_count, 'expiring_count', v_expiring_soon_count, 'low_stock_count', v_low_stock_count, 'recent_objects', COALESCE(v_recent_objects, '[]'::json), 'upcoming_birthdays', COALESCE(v_upcoming_birthdays, '[]'::json), 'pending_tasks', COALESCE(v_pending_tasks, '[]'::json)); END; $$;

DROP FUNCTION IF EXISTS get_customer_details(UUID);
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_customer_profile JSON; v_customer_objects JSON; v_this_customer_is_contact_for JSON; v_contacts_for_this_customer JSON; v_main_contact_associations JSON; BEGIN SELECT json_build_object('id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone, 'birth_date', c.birth_date, 'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id, 'email', c.email, 'address_id', c.address_id, 'address_number', c.address_number, 'address_complement', c.address_complement, 'address', json_build_object('street_name', a.street_name, 'neighborhood', a.neighborhood, 'cep', a.cep, 'city', ci.name, 'state', s.uf)) INTO v_customer_profile FROM public.customers c LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.id = p_customer_id; SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o WHERE normalize_text(o.recipient_name) = normalize_text((SELECT full_name FROM public.customers WHERE id = p_customer_id)); SELECT json_agg(json_build_object('id', dep.id, 'full_name', dep.full_name)) INTO v_this_customer_is_contact_for FROM public.customers dep WHERE dep.contact_customer_id = p_customer_id; SELECT json_agg(json_build_object('id', main.id, 'full_name', main.full_name, 'contact_customer_id', main.contact_customer_id)) INTO v_contacts_for_this_customer FROM public.customers main WHERE main.id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id); SELECT json_agg(json_build_object('id', dep_main.id, 'full_name', dep_main.full_name)) INTO v_main_contact_associations FROM public.customers dep_main WHERE dep_main.contact_customer_id = (SELECT contact_customer_id FROM public.customers WHERE id = p_customer_id); RETURN json_build_object('profile', v_customer_profile, 'objects', COALESCE(v_customer_objects, '[]'::json), 'this_customer_is_contact_for', COALESCE(v_this_customer_is_contact_for, '[]'::json), 'contacts_for_this_customer', COALESCE(v_contacts_for_this_customer, '[]'::json), 'main_contact_associations', COALESCE(v_main_contact_associations, '[]'::json)); END; $$;

DROP FUNCTION IF EXISTS get_supply_stock_log(UUID,DATE);
CREATE OR REPLACE FUNCTION get_supply_stock_log(p_supply_id UUID, p_start_date DATE) RETURNS TABLE (id BIGINT, quantity_changed INT, new_stock_total INT, reason TEXT, created_at TIMESTAMPTZ, user_id UUID) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY SELECT l.id, l.quantity_changed, l.new_stock_total, l.reason, l.created_at, l.user_id FROM public.supply_stock_log l WHERE l.supply_id = p_supply_id AND l.created_at >= p_start_date ORDER BY l.created_at DESC; END; $$;

DROP FUNCTION IF EXISTS get_phones_for_recipients(TEXT[]);
CREATE OR REPLACE FUNCTION get_phones_for_recipients(p_recipient_names TEXT[]) RETURNS JSONB LANGUAGE plpgsql AS $$ DECLARE v_name TEXT; v_phone TEXT; v_result JSONB := '{}'::jsonb; v_customer RECORD; v_contact_customer RECORD; BEGIN FOREACH v_name IN ARRAY p_recipient_names LOOP v_phone := NULL; SELECT * INTO v_customer FROM public.customers WHERE normalize_text(full_name) = normalize_text(v_name) AND is_active = TRUE LIMIT 1; IF FOUND THEN IF v_customer.cellphone IS NOT NULL THEN v_phone := v_customer.cellphone; ELSIF v_customer.contact_customer_id IS NOT NULL THEN SELECT * INTO v_contact_customer FROM public.customers WHERE id = v_customer.contact_customer_id AND is_active = TRUE; IF FOUND AND v_contact_customer.cellphone IS NOT NULL THEN v_phone := v_contact_customer.cellphone; END IF; END IF; END IF; v_result := v_result || jsonb_build_object(v_name, v_phone); END LOOP; RETURN v_result; END; $$;

DROP FUNCTION IF EXISTS save_bulk_report(JSONB);
CREATE OR REPLACE FUNCTION save_bulk_report(p_report_data JSONB) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.bulk_import_reports (user_id, report_data) VALUES (auth.uid(), p_report_data); END; $$;

DROP FUNCTION IF EXISTS get_notifications();
CREATE OR REPLACE FUNCTION get_notifications() RETURNS JSON LANGUAGE plpgsql AS $$ DECLARE notifications_json JSON; BEGIN IF (SELECT get_my_role()) <> 'admin' THEN RETURN '[]'::json; END IF; SELECT json_agg(n) INTO notifications_json FROM (SELECT 'stock' AS type, 'Estoque baixo: ' || name AS message, '/supplies' AS link, id::text AS unique_id FROM public.office_supplies WHERE stock <= 5 UNION ALL SELECT 'task' AS type, 'Tarefa pendente: ' || title AS message, '/tasks' AS link, id::text AS unique_id FROM get_pending_tasks() UNION ALL SELECT 'object' AS type, 'Objeto para ' || recipient_name || ' vence em ' || to_char(storage_deadline, 'DD/MM') AS message, '/objects' AS link, control_number::text AS unique_id FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days')) n; RETURN COALESCE(notifications_json, '[]'::json); END; $$;

DROP FUNCTION IF EXISTS get_monthly_objects_report(INT);
CREATE OR REPLACE FUNCTION get_monthly_objects_report(p_year INT) RETURNS JSON LANGUAGE plpgsql AS $$ DECLARE report_data JSON; BEGIN IF (SELECT get_my_role()) <> 'admin' THEN RETURN '[]'::json; END IF; WITH months AS (SELECT generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), '1 month')::date AS month_start), monthly_stats AS (SELECT date_trunc('month', o.created_at)::date AS month, COUNT(*) AS criados, COUNT(*) FILTER (WHERE o.status = 'Entregue') AS entregues, COUNT(*) FILTER (WHERE o.status = 'Devolvido') AS devolvidos FROM public.objects o WHERE EXTRACT(YEAR FROM o.created_at) = p_year GROUP BY month) SELECT json_agg(t.*) INTO report_data FROM (SELECT to_char(m.month_start, 'Mon') AS mes, COALESCE(ms.criados, 0)::int AS criados, COALESCE(ms.entregues, 0)::int AS entregues, COALESCE(ms.devolvidos, 0)::int AS devolvidos FROM months m LEFT JOIN monthly_stats ms ON m.month_start = ms.month ORDER BY m.month_start) t; RETURN COALESCE(report_data, '[]'::json); END; $$;

DROP FUNCTION IF EXISTS get_supplies_usage_report(INT);
CREATE OR REPLACE FUNCTION get_supplies_usage_report(p_months INT DEFAULT 3) RETURNS JSON LANGUAGE plpgsql AS $$ DECLARE report_data JSON; v_start_date DATE; BEGIN IF (SELECT get_my_role()) <> 'admin' THEN RETURN '[]'::json; END IF; v_start_date := (NOW() - (p_months || ' months')::INTERVAL)::DATE; WITH usage_stats AS (SELECT l.supply_id, SUM(ABS(l.quantity_changed)) AS total_consumed FROM public.supply_stock_log l WHERE l.quantity_changed < 0 AND l.created_at >= v_start_date GROUP BY l.supply_id) SELECT json_agg(t.*) INTO report_data FROM (SELECT s.name AS supply_name, COALESCE(us.total_consumed, 0)::int AS total_consumed, s.stock AS current_stock, (COALESCE(us.total_consumed, 0) / p_months)::decimal(10, 2) AS monthly_avg, GREATEST(0, CEIL((COALESCE(us.total_consumed, 0) / p_months) * 3) - s.stock)::int AS suggestion FROM public.office_supplies s LEFT JOIN usage_stats us ON s.id = us.supply_id ORDER BY total_consumed DESC) t; RETURN COALESCE(report_data, '[]'::json); END; $$;

DROP FUNCTION IF EXISTS get_customers_for_export();
CREATE OR REPLACE FUNCTION get_customers_for_export() RETURNS TABLE (full_name TEXT, cellphone_to_use TEXT, is_active BOOLEAN, birth_date DATE, email TEXT, street_name TEXT, address_number TEXT, neighborhood TEXT, city_name TEXT, state_uf TEXT, cep TEXT, associated_contacts TEXT) LANGUAGE plpgsql AS $$ BEGIN RETURN QUERY SELECT c.full_name::TEXT, COALESCE(c.cellphone, contact.cellphone)::TEXT AS cellphone_to_use, c.is_active, c.birth_date, c.email::TEXT, a.street_name::TEXT, c.address_number::TEXT, a.neighborhood::TEXT, ci.name::TEXT AS city_name, s.uf::TEXT AS state_uf, a.cep::TEXT, (SELECT STRING_AGG(dependent.full_name, ', ') FROM public.customers dependent WHERE dependent.contact_customer_id = c.id)::TEXT AS associated_contacts FROM public.customers c LEFT JOIN public.customers contact ON c.contact_customer_id = contact.id LEFT JOIN public.addresses a ON c.address_id = a.id LEFT JOIN public.cities ci ON a.city_id = ci.id LEFT JOIN public.states s ON ci.state_id = s.id WHERE c.cellphone IS NOT NULL OR contact.cellphone IS NOT NULL; END; $$;

-- Triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.employees (id, full_name, registration_number, role) VALUES (new.id, 'Novo Usuário', new.id::text, 'employee'); RETURN new; END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--------------------------------------------------------------------------------
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.employees WHERE id = p_user_id AND role = 'admin'); END; $$;

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

DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename) || ';'; END LOOP; END $$;

CREATE POLICY "Allow read access to all authenticated users" ON public.states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can manage data" ON public.addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.office_supplies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.supply_stock_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.bulk_import_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.system_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage their own themes" ON public.user_themes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employees can view their own data" ON public.employees FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage object types" ON public.object_types FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Allow read access to object types" ON public.object_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tracking rules" ON public.tracking_code_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Allow read access to tracking rules" ON public.tracking_code_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Allow read access to app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage task completions" ON public.task_completions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
