-- Arquivo: supabase/migrations/046_reporting_and_sorting_features.sql
-- Descrição: Adiciona a tabela de relatórios e atualiza funções.

-- Etapa 1: Criar a tabela para armazenar os relatórios de inserção em massa.
CREATE TABLE public.bulk_import_reports (
    id BIGSERIAL PRIMARY KEY,
    report_data JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bulk_import_reports IS 'Armazena os relatórios gerados após inserções em massa.';

-- Etapa 2: Criar a função para salvar um novo relatório.
CREATE OR REPLACE FUNCTION save_bulk_report(
    p_report_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.bulk_import_reports (user_id, report_data)
    VALUES (auth.uid(), p_report_data);
END;
$$;

-- Etapa 3: Garantir que a função de inserção em massa está correta.
DROP FUNCTION IF EXISTS public.bulk_create_registered_objects(registered_object_input[]);
DROP TYPE IF EXISTS registered_object_input CASCADE;

CREATE TYPE registered_object_input AS (
    tracking_code TEXT,
    recipient_name TEXT,
    street_name TEXT,
    address_number TEXT,
    address_complement TEXT,
    object_type TEXT
);

CREATE OR REPLACE FUNCTION bulk_create_registered_objects(p_objects registered_object_input[])
RETURNS TABLE (report_recipient_name TEXT, report_control_number INT, report_tracking_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    obj registered_object_input; v_rule RECORD; v_recipient_name TEXT; v_street_name TEXT;
    v_address_number TEXT; v_address_complement TEXT; v_address_id UUID; v_city_id INT;
    v_customer_id UUID; v_storage_deadline DATE; v_new_control_number INT;
BEGIN
    SELECT id INTO v_city_id FROM cities WHERE name = 'América Dourada' LIMIT 1;
    IF v_city_id IS NULL THEN RAISE EXCEPTION 'A cidade padrão "América Dourada" não foi encontrada.'; END IF;

    FOREACH obj IN ARRAY p_objects
    LOOP
        SELECT * INTO v_rule FROM public.tracking_code_rules WHERE upper(obj.tracking_code) LIKE upper(prefix) || '%';
        IF NOT FOUND THEN v_storage_deadline := CURRENT_DATE + INTERVAL '7 days';
        ELSE v_storage_deadline := CURRENT_DATE + (v_rule.storage_days || ' days')::INTERVAL;
        END IF;

        v_recipient_name := proper_case(obj.recipient_name); v_street_name := proper_case(obj.street_name);
        v_address_number := obj.address_number; v_address_complement := obj.address_complement;

        SELECT id INTO v_address_id FROM addresses WHERE normalize_text(street_name) = normalize_text(v_street_name) AND city_id = v_city_id LIMIT 1;
        IF v_address_id IS NULL THEN
            INSERT INTO addresses (street_name, city_id) VALUES (v_street_name, v_city_id) RETURNING id INTO v_address_id;
        END IF;

        SELECT id INTO v_customer_id FROM customers WHERE normalize_text(full_name) = normalize_text(v_recipient_name) LIMIT 1;
        IF v_customer_id IS NULL THEN
            INSERT INTO public.customers (full_name, address_id, address_number, address_complement) VALUES (v_recipient_name, v_address_id, v_address_number, v_address_complement) RETURNING id INTO v_customer_id;
        ELSE
            UPDATE public.customers SET address_id = v_address_id, address_number = v_address_number, address_complement = v_address_complement WHERE id = v_customer_id;
        END IF;

        INSERT INTO public.objects (recipient_name, object_type, tracking_code, storage_deadline, customer_id, delivery_address_id)
        VALUES (v_recipient_name, obj.object_type, upper(obj.tracking_code), v_storage_deadline, v_customer_id, v_address_id)
        RETURNING control_number INTO v_new_control_number;

        report_recipient_name := v_recipient_name;
        report_control_number := v_new_control_number;
        report_tracking_code := upper(obj.tracking_code);
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;
