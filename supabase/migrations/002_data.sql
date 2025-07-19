-- Arquivo: supabase/migrations/002_data.sql
-- Descrição: Insere os dados iniciais (sementes) e cria os tipos customizados.

--------------------------------------------------------------------------------
-- 3. DADOS INICIAIS (SEMENTES)
--------------------------------------------------------------------------------
INSERT INTO public.object_types (name, default_storage_days) VALUES
('Encomenda PAC', 7), ('SEDEX', 7), ('Carta Registrada', 20), ('Carta Simples', 20), ('Revista', 20), ('Cartão', 20), ('Telegrama', 7), ('Cartão Registrado', 20), ('Registrado', 7), ('Outro', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tracking_code_rules (prefix, object_type, storage_days) VALUES
('AC', 'Encomenda PAC', 7), ('QB', 'Encomenda PAC', 7), ('SS', 'SEDEX', 7), ('BR', 'Carta Registrada', 20), ('YD', 'Cartão Registrado', 20)
ON CONFLICT (prefix) DO NOTHING;

INSERT INTO public.app_settings (key, value, description, label) VALUES
('agency_name', 'Correio de América Dourada', 'Nome da agência exibido no sistema.', 'Nome da Agência'),
('agency_dh', '', 'Número da DH (Diretoria de Hubs)', 'Código DH'),
('agency_mcu', '', 'MCU (Unidade de Correios) da Agência', 'Código MCU'),
('agency_sto', '', 'STO (Setor de Triagem e Operações)', 'Código STO'),
('agency_address', '', 'Endereço completo da agência', 'Endereço da Agência')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.tasks (title, description, frequency_type) VALUES
('Verificar Caixa de E-mails', 'Responder e organizar os e-mails da agência.', 'daily'),
('Conferir Estoque Mínimo', 'Verificar se algum material de expediente precisa de ser reabastecido.', 'weekly'),
('Relatório Mensal de Objetos', 'Analisar o fluxo de objetos do último mês.', 'monthly'),
('Backup do Sistema', 'Realizar o backup dos dados importantes.', 'monthly')
ON CONFLICT DO NOTHING;

--------------------------------------------------------------------------------
-- 4. TIPOS CUSTOMIZADOS
--------------------------------------------------------------------------------
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
