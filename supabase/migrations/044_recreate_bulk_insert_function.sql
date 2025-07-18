-- Arquivo: supabase/migrations/044_recreate_bulk_insert_function.sql
-- Descrição: Altera a tabela de endereços para permitir CEP nulo e recria a função de inserção em massa.

-- Etapa 1: Alterar a coluna 'cep' para permitir valores nulos.
-- Isto é necessário para cadastrar ruas de objetos simples que não possuem CEP.
ALTER TABLE public.addresses
ALTER COLUMN cep DROP NOT NULL;

-- Etapa 2: Apagar completamente a função existente para garantir uma recriação limpa.
DROP FUNCTION IF EXISTS public.bulk_create_simple_objects(text, simple_object_input[]);
DROP FUNCTION IF EXISTS public.bulk_create_simple_objects;


-- Etapa 3: Garantir que o tipo de dado customizado existe.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_object_input') THEN
        CREATE TYPE simple_object_input AS (
            recipient_name TEXT,
            street_name TEXT
        );
    END IF;
END$$;

-- Etapa 4: Recriar a função com a lógica correta para CEPs nulos.
CREATE OR REPLACE FUNCTION bulk_create_simple_objects(
    p_object_type TEXT,
    p_objects simple_object_input[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    obj simple_object_input;
    v_recipient_name TEXT;
    v_street_name TEXT;
    v_address_id UUID;
    v_city_id INT;
    v_customer_id UUID;
    v_storage_deadline DATE;
    v_created_count INT := 0;
BEGIN
    SELECT id INTO v_city_id FROM cities WHERE name = 'América Dourada' LIMIT 1;
    IF v_city_id IS NULL THEN
        RAISE EXCEPTION 'A cidade padrão "América Dourada" não foi encontrada.';
    END IF;

    v_storage_deadline := CURRENT_DATE + INTERVAL '20 days';

    FOREACH obj IN ARRAY p_objects
    LOOP
        v_recipient_name := proper_case(obj.recipient_name);
        v_street_name := proper_case(obj.street_name);

        -- Procura por um endereço existente.
        SELECT id INTO v_address_id FROM addresses WHERE normalize_text(street_name) = normalize_text(v_street_name) AND city_id = v_city_id LIMIT 1;

        -- Se não encontrar, cria um novo com CEP nulo.
        IF v_address_id IS NULL THEN
            INSERT INTO addresses (street_name, city_id, cep) VALUES (v_street_name, v_city_id, NULL) RETURNING id INTO v_address_id;
        END IF;

        -- Procura pelo cliente correspondente para fazer a associação.
        SELECT id INTO v_customer_id FROM customers WHERE normalize_text(full_name) = normalize_text(v_recipient_name) LIMIT 1;

        -- Insere o novo objeto na base de dados.
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, customer_id, delivery_address_id)
        VALUES (v_recipient_name, p_object_type, v_storage_deadline, v_customer_id, v_address_id);

        v_created_count := v_created_count + 1;
    END LOOP;

    RETURN v_created_count;
END;
$$;
