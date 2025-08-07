-- path: supabase/migrations/0001_estrutura_db.sql
-- =============================================================================
-- || ARQUIVO MESTRE 1: ESTRUTURA, TIPOS E DADOS INICIAIS                     ||
-- =============================================================================
-- DESCRIÇÃO: Script idempotente para criar toda a estrutura de tabelas, tipos,
-- extensões, dados iniciais e índices de performance do banco de dados.

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
-- 2. TABELAS E TIPOS
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

-- Adiciona constraints se não existirem
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.addresses'::regclass AND conname = 'addresses_street_name_city_id_cep_key') THEN DELETE FROM public.addresses a WHERE a.id NOT IN ( SELECT id FROM ( SELECT id, ROW_NUMBER() OVER(PARTITION BY street_name, city_id, cep ORDER BY created_at) as rn FROM public.addresses ) t WHERE t.rn = 1 ); ALTER TABLE public.addresses ADD CONSTRAINT addresses_street_name_city_id_cep_key UNIQUE (street_name, city_id, cep); END IF; END; $$;

-- Cria tipos customizados se não existirem
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_object_input') THEN
        CREATE TYPE simple_object_input AS (recipient_name TEXT, street_name TEXT);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registered_object_input') THEN
        CREATE TYPE registered_object_input AS ( tracking_code TEXT, recipient_name TEXT, street_name TEXT, address_number TEXT, address_complement TEXT, object_type TEXT );
    END IF;
END $$;

--------------------------------------------------------------------------------
-- 3. DADOS INICIAIS (SEED)
--------------------------------------------------------------------------------
INSERT INTO public.object_types (name, default_storage_days) VALUES ('PAC', 7), ('SEDEX', 7), ('Carta Registrada', 20), ('Carta Simples', 20), ('Revista', 20), ('Cartão', 20), ('Telegrama', 7), ('Cartão Registrado', 20), ('Registrado', 7), ('Outro', 7) ON CONFLICT (name) DO NOTHING;
INSERT INTO public.app_settings (key, value, description, label) VALUES ('agency_name', 'Correio de América Dourada', 'Nome da agência exibido no sistema.', 'Nome da Agência'), ('agency_dh', '10h05', 'Horario limite de postagem', 'Horario Limite'), ('agency_mcu', '00002678', 'MCU (Unidade de Correios) da Agência', 'MCU'), ('agency_sto', '08301026', 'STO (Setor de Triagem e Operações)', 'STO'), ('agency_address', 'Avenida Romão Gramacho, sn - Centro, América Dourada/BA', 'Endereço completo da agência', 'Endereço') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.tasks (title, description, frequency_type) VALUES ('Verificar Caixa de E-mails', 'Responder e organizar os e-mails da agência.', 'daily'), ('Conferir Estoque Mínimo', 'Verificar se algum material de expediente precisa de ser reabastecido.', 'weekly'), ('Relatório Mensal de Objetos', 'Analisar o fluxo de objetos do último mês.', 'monthly') ON CONFLICT (title) DO NOTHING;

--------------------------------------------------------------------------------
-- 4. ÍNDICES DE PERFORMANCE
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm ON public.customers USING gin (public.f_unaccent(full_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_addresses_street_name_trgm ON public.addresses USING gin (public.f_unaccent(street_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_office_supplies_name_trgm ON public.office_supplies USING gin (public.f_unaccent(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_system_links_name_trgm ON public.system_links USING gin (public.f_unaccent(name) gin_trgm_ops);
