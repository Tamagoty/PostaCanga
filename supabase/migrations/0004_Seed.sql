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
