-- Arquivo: supabase/migrations/001_initial_schema.sql
-- Descrição: Define a estrutura de tabelas principal para o aplicativo de gerenciamento de correios.

-- Habilitar a extensão para gerar UUIDs, caso ainda não esteja habilitada.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Endereços
-- Armazena informações de endereço de forma centralizada.
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cep VARCHAR(9) NOT NULL, -- Ex: "12345-678"
    street_type VARCHAR(50), -- Ex: "Rua", "Avenida"
    street_name VARCHAR(255) NOT NULL,
    neighborhood VARCHAR(150),
    city VARCHAR(150) NOT NULL,
    state VARCHAR(2) NOT NULL, -- UF
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.addresses IS 'Tabela central para armazenar endereços de clientes e objetos.';

-- Tabela de Clientes
-- Armazena dados dos clientes.
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    cellphone VARCHAR(20) UNIQUE,
    birth_date DATE,
    cpf VARCHAR(14) UNIQUE, -- Ex: "123.456.789-00"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.customers IS 'Armazena informações sobre os clientes.';
COMMENT ON COLUMN public.customers.full_name IS 'Nome completo do cliente. Usado para vincular objetos.';
COMMENT ON COLUMN public.customers.cellphone IS 'Número de celular único para contato via WhatsApp.';

-- Tabela de Funcionários (Usuários do Sistema)
-- Esta tabela complementa a tabela `auth.users` do Supabase.
CREATE TABLE public.employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL, -- Matrícula
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.employees IS 'Dados adicionais dos funcionários que são usuários do sistema.';

-- Tabela de Objetos (Encomendas, Cartas, etc.)
-- O coração do sistema, armazena os itens recebidos.
CREATE TABLE public.objects (
    control_number SERIAL PRIMARY KEY, -- Número de controle sequencial para localização física.
    recipient_name VARCHAR(255) NOT NULL, -- Nome do destinatário (liga ao cliente)
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL, -- Link direto para o cliente, se identificado
    delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    tracking_code VARCHAR(100) UNIQUE, -- Código de rastreamento para objetos registrados
    object_type VARCHAR(100) NOT NULL, -- Ex: "Carta Registrada", "PAC", "Revista"
    arrival_date DATE NOT NULL DEFAULT CURRENT_DATE,
    storage_deadline DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Aguardando Retirada', -- Ex: "Aguardando Retirada", "Entregue", "Devolvido"
    created_at TIMESTIMETZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.objects IS 'Registra todos os objetos postais que chegam.';
COMMENT ON COLUMN public.objects.control_number IS 'PK, sequencial, para fácil localização nas prateleiras.';
COMMENT ON COLUMN public.objects.recipient_name IS 'Nome no objeto, usado para busca inicial do cliente.';
COMMENT ON COLUMN public.objects.storage_deadline IS 'Data limite para a guarda do objeto.';


-- Tabela de Material de Expediente
-- Gerencia o estoque de materiais de escritório.
CREATE TABLE public.office_supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) UNIQUE NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.office_supplies IS 'Controle de estoque para material de expediente.';
COMMENT ON COLUMN public.office_supplies.stock IS 'Quantidade atual em estoque.';

-- Tabela para Temas Salvos pelos Usuários
CREATE TABLE public.user_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_name VARCHAR(50) NOT NULL,
    theme_colors JSONB NOT NULL, -- Armazena as cores como um objeto JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, theme_name)
);

COMMENT ON TABLE public.user_themes IS 'Armazena os temas de cores personalizados salvos pelos usuários.';
