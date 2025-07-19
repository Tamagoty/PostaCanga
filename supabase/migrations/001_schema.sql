-- Arquivo: supabase/migrations/001_schema.sql
-- Descrição: Cria as extensões e toda a estrutura de tabelas do banco de dados.

--------------------------------------------------------------------------------
-- 1. EXTENSÕES
--------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

--------------------------------------------------------------------------------
-- 2. TABELAS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.states (
    id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, uf CHAR(2) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, state_id INT NOT NULL REFERENCES public.states(id)
);
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), cep VARCHAR(9), street_name TEXT NOT NULL, neighborhood TEXT, city_id INT REFERENCES public.cities(id), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(street_name, city_id, cep)
);
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), full_name TEXT NOT NULL, cpf VARCHAR(14) UNIQUE, cellphone VARCHAR(20) UNIQUE, email VARCHAR(255) UNIQUE, birth_date DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE, address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, address_number VARCHAR(20), address_complement VARCHAR(100), contact_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT chk_self_contact CHECK (id <> contact_customer_id)
);
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, full_name TEXT NOT NULL, registration_number VARCHAR(50) UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'employee', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.object_types (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, default_storage_days INT NOT NULL DEFAULT 20
);
CREATE TABLE IF NOT EXISTS public.objects (
    control_number SERIAL PRIMARY KEY, recipient_name TEXT NOT NULL, customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, tracking_code VARCHAR(100), object_type VARCHAR(100) NOT NULL, arrival_date DATE NOT NULL DEFAULT CURRENT_DATE, storage_deadline DATE NOT NULL, status VARCHAR(50) DEFAULT 'Aguardando Retirada', is_archived BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.office_supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(150) UNIQUE NOT NULL, stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0), description TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.supply_stock_log (
    id BIGSERIAL PRIMARY KEY, supply_id UUID NOT NULL REFERENCES public.office_supplies(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, quantity_changed INT NOT NULL, new_stock_total INT NOT NULL, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, theme_name VARCHAR(50) NOT NULL, theme_colors JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, theme_name)
);
CREATE TABLE IF NOT EXISTS public.tracking_code_rules (
    id SERIAL PRIMARY KEY, prefix VARCHAR(10) NOT NULL UNIQUE, object_type VARCHAR(100) NOT NULL, storage_days INT NOT NULL DEFAULT 7, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.bulk_import_reports (
    id BIGSERIAL PRIMARY KEY, report_data JSONB NOT NULL, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, label TEXT
);
CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, frequency_type TEXT NOT NULL, due_date DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.task_completions (
    id BIGSERIAL PRIMARY KEY, task_id INT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.system_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, url TEXT NOT NULL, description TEXT, details TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
