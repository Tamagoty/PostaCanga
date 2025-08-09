-- supabase/migrations/0004_Seed.sql
-- =============================================================================
-- || ARQUIVO 4: DADOS INICIAIS (SEED)                                        ||
-- =============================================================================
-- DESCRIÇÃO: Insere os dados iniciais necessários para o funcionamento da
-- aplicação, como tipos de objetos, configurações e tarefas padrão.

-- Dados para a tabela de Tipos de Objeto
INSERT INTO public.object_types (name, default_storage_days) VALUES
    ('PAC', 7),
    ('SEDEX', 7),
    ('Carta Registrada', 20),
    ('Carta Simples', 20),
    ('Revista', 20),
    ('Cartão', 20),
    ('Telegrama', 7),
    ('Cartão Registrado', 20),
    ('Registrado', 7),
    ('Outro', 7)
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

-- Adicione aqui os dados das tabelas states e cities se desejar pré-popular
-- Ex: INSERT INTO public.states (name, uf) VALUES ('Bahia', 'BA') ON CONFLICT (uf) DO NOTHING;
