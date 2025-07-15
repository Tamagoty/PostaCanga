-- Arquivo: supabase/seed/002_seed_objetos.sql
-- Descrição: Insere objetos de exemplo na tabela 'objects' para teste e desenvolvimento.
-- As datas são baseadas na data atual (aproximadamente 15 de Julho de 2025).

INSERT INTO public.objects (recipient_name, delivery_address_id, tracking_code, object_type, arrival_date, storage_deadline, status)
VALUES
    -- Objeto 1: PAC aguardando retirada
    ('João da Silva', NULL, 'QB123456789BR', 'Encomenda PAC', '2025-07-14', '2025-07-29', 'Aguardando Retirada'),

    -- Objeto 2: SEDEX já entregue
    ('Maria Oliveira', NULL, 'SS987654321BR', 'SEDEX', '2025-07-10', '2025-07-25', 'Entregue'),

    -- Objeto 3: Carta Registrada aguardando retirada
    ('Carlos Pereira', NULL, 'JR112233445BR', 'Carta Registrada', '2025-07-15', '2025-08-14', 'Aguardando Retirada'),

    -- Objeto 4: Revista sem rastreio
    ('Ana Costa', NULL, NULL, 'Revista', '2025-07-12', '2025-08-11', 'Aguardando Retirada'),

    -- Objeto 5: Objeto devolvido
    ('Pedro Martins', NULL, 'QB998877665BR', 'Encomenda PAC', '2025-06-20', '2025-07-05', 'Devolvido'),
    
    -- Objeto 6: Telegrama urgente
    ('Fernanda Lima', NULL, NULL, 'Telegrama', '2025-07-15', '2025-07-22', 'Aguardando Retirada'),

    -- Objeto 7: Outro objeto para o João da Silva
    ('João da Silva', NULL, 'LE123123123SE', 'SEDEX', '2025-07-15', '2025-07-30', 'Aguardando Retirada')

ON CONFLICT (control_number) DO NOTHING; -- Evita erro se o script for executado múltiplas vezes, embora seja improvável com SERIAL.
-- Usar ON CONFLICT em uma coluna única como 'tracking_code' seria mais robusto se necessário.
-- ON CONFLICT (tracking_code) DO UPDATE SET recipient_name = EXCLUDED.recipient_name;
