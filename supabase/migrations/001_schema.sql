-- Arquivo: supabase/migrations/001_schema.sql
-- Descrição: Script consolidado para criar toda a estrutura de tabelas do banco de dados.

-- Habilita a extensão para gerar UUIDs.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Estados (UFs)
CREATE TABLE public.states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL UNIQUE
);
COMMENT ON TABLE public.states IS 'Armazena os estados do Brasil.';

-- Tabela de Cidades
CREATE TABLE public.cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id INT NOT NULL REFERENCES public.states(id)
);
COMMENT ON TABLE public.cities IS 'Armazena as cidades, vinculadas a um estado.';

-- Tabela de Endereços (Catálogo de Ruas)
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cep VARCHAR(9),
    street_name TEXT NOT NULL,
    neighborhood TEXT,
    city_id INT REFERENCES public.cities(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(street_name, city_id, cep) -- Garante que cada rua seja única por cidade/cep
);
COMMENT ON TABLE public.addresses IS 'Catálogo central de ruas e logradouros.';

-- Tabela de Clientes
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    cellphone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    birth_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    contact_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_self_contact CHECK (id <> contact_customer_id)
);
COMMENT ON TABLE public.customers IS 'Armazena os dados dos clientes.';

-- Tabela de Funcionários (Usuários do Sistema)
CREATE TABLE public.employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.employees IS 'Dados adicionais e permissões dos funcionários.';

-- Tabela de Objetos (Encomendas, Cartas, etc.)
CREATE TABLE public.objects (
    control_number SERIAL PRIMARY KEY,
    recipient_name TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    tracking_code VARCHAR(100),
    object_type VARCHAR(100) NOT NULL,
    arrival_date DATE NOT NULL DEFAULT CURRENT_DATE,
    storage_deadline DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Aguardando Retirada',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.objects IS 'Registra todos os objetos postais que chegam.';

-- Tabela de Material de Expediente
CREATE TABLE public.office_supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) UNIQUE NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.office_supplies IS 'Controle de estoque para material de expediente.';

-- Tabela de Histórico de Estoque
CREATE TABLE public.supply_stock_log (
    id BIGSERIAL PRIMARY KEY,
    supply_id UUID NOT NULL REFERENCES public.office_supplies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    quantity_changed INT NOT NULL,
    new_stock_total INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.supply_stock_log IS 'Registra cada entrada e saída de material do estoque.';

-- Tabela para Temas Salvos pelos Usuários
CREATE TABLE public.user_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_name VARCHAR(50) NOT NULL,
    theme_colors JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, theme_name)
);
COMMENT ON TABLE public.user_themes IS 'Armazena os temas de cores personalizados salvos pelos usuários.';
