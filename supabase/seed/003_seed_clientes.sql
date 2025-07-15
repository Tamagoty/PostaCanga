-- Arquivo: supabase/seed/003_seed_clientes.sql
-- Descrição: Insere clientes e endereços de exemplo para teste e desenvolvimento.

-- Inserir alguns endereços primeiro
WITH new_addresses AS (
    INSERT INTO public.addresses (cep, street_type, street_name, neighborhood, city, state)
    VALUES
        ('12345-678', 'Rua', 'das Flores', 'Centro', 'São Paulo', 'SP'),
        ('98765-432', 'Avenida', 'Brasil', 'Jardins', 'Rio de Janeiro', 'RJ'),
        ('54321-876', 'Praça', 'da Sé', 'Centro', 'Salvador', 'BA')
    RETURNING id, street_name
)
-- Inserir clientes, associando alguns aos endereços criados
INSERT INTO public.customers (full_name, address_id, cellphone, birth_date, cpf)
VALUES
    -- Cliente com endereço e dados completos
    ('João da Silva', (SELECT id FROM new_addresses WHERE street_name = 'das Flores'), '11987654321', '1985-04-23', '111.222.333-44'),
    
    -- Cliente com endereço e sem CPF
    ('Maria Oliveira', (SELECT id FROM new_addresses WHERE street_name = 'Brasil'), '21912345678', '1990-11-15', NULL),
    
    -- Cliente sem endereço
    ('Carlos Pereira', NULL, '71999887766', '1978-08-01', '444.555.666-77'),
    
    -- Cliente com dados mínimos
    ('Ana Costa', NULL, NULL, NULL, NULL)

ON CONFLICT (cpf) DO NOTHING; -- Evita erro se um cliente com o mesmo CPF já existir.
-- Para o celular, a restrição UNIQUE já previne duplicados.
