-- Arquivo: supabase/migrations/046_create_tracking_rules_system.sql
-- Descrição: Cria a tabela e as funções para gerir as regras de rastreamento.

-- Etapa 1: Criar a tabela para armazenar as regras.
CREATE TABLE public.tracking_code_rules (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL UNIQUE,
    object_type VARCHAR(100) NOT NULL,
    storage_days INT NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tracking_code_rules IS 'Associa prefixos de rastreamento a tipos de objeto e prazos de guarda.';

-- Etapa 2: Popular com as regras iniciais que já conhecemos.
INSERT INTO public.tracking_code_rules (prefix, object_type, storage_days) VALUES
('AC', 'Encomenda PAC', 7),
('QB', 'Encomenda PAC', 7),
('SS', 'SEDEX', 7),
('BR', 'Carta Registrada', 20),
('YD', 'Cartão Registrado', 20)
ON CONFLICT (prefix) DO NOTHING;

-- Etapa 3: Criar funções para gerir as regras.
CREATE OR REPLACE FUNCTION create_or_update_tracking_rule(p_rule_id INT, p_prefix TEXT, p_object_type TEXT, p_storage_days INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    IF p_rule_id IS NOT NULL THEN
        UPDATE public.tracking_code_rules SET prefix=p_prefix, object_type=p_object_type, storage_days=p_storage_days WHERE id = p_rule_id;
    ELSE
        INSERT INTO public.tracking_code_rules (prefix, object_type, storage_days) VALUES (p_prefix, p_object_type, p_storage_days);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_tracking_rule(p_rule_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    DELETE FROM public.tracking_code_rules WHERE id = p_rule_id;
END;
$$;

-- Etapa 4: Atualizar a função de inserção em massa para usar a nova tabela de regras.
DROP FUNCTION IF EXISTS public.bulk_create_registered_objects(registered_object_input[]);
CREATE OR REPLACE FUNCTION bulk_create_registered_objects(p_objects registered_object_input[])
RETURNS TABLE (report_recipient_name TEXT, report_control_number INT, report_tracking_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    obj registered_object_input;
    v_rule RECORD;
    v_recipient_name TEXT;
    v_street_name TEXT;
    v_address_number TEXT;
    v_address_complement TEXT;
    v_address_id UUID;
    v_city_id INT;
    v_customer_id UUID;
    v_storage_deadline DATE;
    v_new_control_number INT;
BEGIN
    SELECT id INTO v_city_id FROM cities WHERE name = 'América Dourada' LIMIT 1;
    IF v_city_id IS NULL THEN RAISE EXCEPTION 'A cidade padrão "América Dourada" não foi encontrada.'; END IF;

    FOREACH obj IN ARRAY p_objects
    LOOP
        -- Busca a regra correspondente ao prefixo do código de rastreamento.
        SELECT * INTO v_rule FROM public.tracking_code_rules WHERE obj.tracking_code LIKE prefix || '%';
        
        IF NOT FOUND THEN
            -- Se nenhuma regra for encontrada, usa um padrão.
            v_storage_deadline := CURRENT_DATE + INTERVAL '7 days';
        ELSE
            v_storage_deadline := CURRENT_DATE + (v_rule.storage_days || ' days')::INTERVAL;
        END IF;

        v_recipient_name := proper_case(obj.recipient_name);
        v_street_name := proper_case(obj.street_name);
        v_address_number := obj.address_number;
        v_address_complement := obj.address_complement;

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
        VALUES (v_recipient_name, COALESCE(v_rule.object_type, 'Registrado'), obj.tracking_code, v_storage_deadline, v_customer_id, v_address_id)
        RETURNING control_number INTO v_new_control_number;

        report_recipient_name := v_recipient_name;
        report_control_number := v_new_control_number;
        report_tracking_code := obj.tracking_code;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$;
