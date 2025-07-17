-- Arquivo: supabase/migrations/044_recreate_bulk_insert_function.sql
-- Descrição: Altera a função de inserção em massa para retornar um relatório detalhado.

-- Etapa 1: Apagar completamente a função existente para garantir uma recriação limpa.
DROP FUNCTION IF EXISTS public.bulk_create_simple_objects(text, simple_object_input[]);
DROP FUNCTION IF EXISTS public.bulk_create_simple_objects;

-- Etapa 2: Garantir que o tipo de dado customizado existe.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'simple_object_input') THEN
        CREATE TYPE simple_object_input AS (
            recipient_name TEXT,
            street_name TEXT
        );
    END IF;
END$$;

-- Etapa 3: Recriar a função para que ela retorne uma tabela com o relatório.
CREATE OR REPLACE FUNCTION bulk_create_simple_objects(
    p_object_type TEXT,
    p_objects simple_object_input[]
)
RETURNS TABLE ( -- MUDANÇA: Retorna uma tabela em vez de um inteiro.
    report_recipient_name TEXT,
    report_control_number INT
)
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
    v_new_control_number INT;
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

        SELECT id INTO v_address_id FROM addresses WHERE normalize_text(street_name) = normalize_text(v_street_name) AND city_id = v_city_id LIMIT 1;

        IF v_address_id IS NULL THEN
            INSERT INTO addresses (street_name, city_id, cep) VALUES (v_street_name, v_city_id, NULL) RETURNING id INTO v_address_id;
        END IF;

        SELECT id INTO v_customer_id FROM customers WHERE normalize_text(full_name) = normalize_text(v_recipient_name) LIMIT 1;

        -- Insere o novo objeto e retorna os dados para o relatório.
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, customer_id, delivery_address_id)
        VALUES (v_recipient_name, p_object_type, v_storage_deadline, v_customer_id, v_address_id)
        RETURNING control_number INTO v_new_control_number;

        -- Prepara a linha para ser retornada.
        report_recipient_name := v_recipient_name;
        report_control_number := v_new_control_number;
        RETURN NEXT; -- Adiciona a linha ao conjunto de resultados.
    END LOOP;

    RETURN;
END;
$$;
