-- =============================================================================
-- || SCRIPT MESTRE DE BANCO DE DADOS IDEMPOTENTE - POSTACANGA APP            ||
-- =============================================================================
-- DESCRIÇÃO: Script único e consolidado para criar ou atualizar o banco de dados.
--            Pode ser executado com segurança em ambientes novos ou existentes.
-- VERSÃO: 1.0

--------------------------------------------------------------------------------
-- 1. EXTENSÕES E FUNÇÕES BASE
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Cria uma função "wrapper" imutável para unaccent da qual somos donos,
-- permitindo a sua utilização na criação de índices de performance.
-- Define o search_path para garantir que o dicionário seja encontrado.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'public'
AS $function$
    SELECT public.unaccent('unaccent', $1);
$function$;

--------------------------------------------------------------------------------
-- 2. TABELAS E TIPOS
--------------------------------------------------------------------------------

-- Tabelas principais
CREATE TABLE IF NOT EXISTS public.states (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, uf CHAR(2) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS public.cities (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, state_id INT NOT NULL REFERENCES public.states(id));
CREATE TABLE IF NOT EXISTS public.addresses (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), cep VARCHAR(9), street_name TEXT NOT NULL, neighborhood TEXT, city_id INT REFERENCES public.cities(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
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

-- Adiciona colunas de endereço diretamente na tabela de objetos.
ALTER TABLE public.objects
ADD COLUMN IF NOT EXISTS delivery_street_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_number TEXT,
ADD COLUMN IF NOT EXISTS delivery_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS delivery_city_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_state_uf CHAR(2),
ADD COLUMN IF NOT EXISTS delivery_cep VARCHAR(9);

-- Garante a restrição UNIQUE na tabela de endereços para evitar duplicados.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.addresses'::regclass AND conname = 'addresses_street_name_city_id_cep_key') THEN
        -- Antes de adicionar a constraint, removemos os duplicados, mantendo o registo mais antigo.
        DELETE FROM public.addresses a
        WHERE a.id NOT IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER(PARTITION BY street_name, city_id, cep ORDER BY created_at) as rn
                FROM public.addresses
            ) t
            WHERE t.rn = 1
        );
        -- Agora, adiciona a constraint de unicidade.
        ALTER TABLE public.addresses ADD CONSTRAINT addresses_street_name_city_id_cep_key UNIQUE (street_name, city_id, cep);
    END IF;
END;
$$;

-- Garante a restrição UNIQUE na tabela de tarefas para idempotência
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND conname = 'tasks_title_unique') THEN
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_title_unique UNIQUE (title);
    END IF;
END;
$$;

-- Tipos customizados para inserção em massa
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
-- 3. DADOS INICIAIS
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

--------------------------------------------------------------------------------
-- 4. FUNÇÕES RPC
--------------------------------------------------------------------------------

-- ... (Aqui entrariam todas as suas funções CREATE OR REPLACE FUNCTION) ...
-- Exemplo:
-- DROP FUNCTION IF EXISTS public.get_my_role();
-- CREATE OR REPLACE FUNCTION get_my_role() ...

-- Função de exportação corrigida
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

-- Função de criação de objetos com lógica de endereço atualizada
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
-- 5. ÍNDICES DE PERFORMANCE
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm ON public.customers USING gin (public.f_unaccent(full_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_addresses_street_name_trgm ON public.addresses USING gin (public.f_unaccent(street_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_office_supplies_name_trgm ON public.office_supplies USING gin (public.f_unaccent(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_system_links_name_trgm ON public.system_links USING gin (public.f_unaccent(name) gin_trgm_ops);

--------------------------------------------------------------------------------
-- 6. POLÍTICAS DE SEGURANÇA (RLS)
--------------------------------------------------------------------------------
-- ... (Aqui entrariam todas as suas políticas RLS) ...
-- Exemplo:
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Employees can manage data" ON public.customers;
-- CREATE POLICY "Employees can manage data" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

