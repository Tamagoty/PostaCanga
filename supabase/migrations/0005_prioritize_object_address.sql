-- ARQUIVO: 0005_prioritize_object_address.sql
-- DESCRIÇÃO: Altera a função de criação de objetos para priorizar o endereço
--            fornecido com o objeto, em vez do endereço padrão do cliente.

DROP FUNCTION IF EXISTS create_or_update_object(TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_object(
    p_recipient_name TEXT,
    p_object_type TEXT,
    p_tracking_code TEXT DEFAULT NULL,
    p_control_number INT DEFAULT NULL,
    p_cep TEXT DEFAULT NULL,
    p_street_name TEXT DEFAULT NULL,
    p_number TEXT DEFAULT NULL,
    p_neighborhood TEXT DEFAULT NULL,
    p_city_name TEXT DEFAULT NULL,
    p_state_uf TEXT DEFAULT NULL
)
RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_customer_id UUID;
    v_address_id UUID;
    v_storage_deadline DATE;
    v_storage_days INT;
    result_object objects;
BEGIN
    -- Validações e cálculo do prazo de guarda (sem alterações)
    IF NOT EXISTS (SELECT 1 FROM public.object_types WHERE name = p_object_type) THEN
        RAISE EXCEPTION 'O tipo de objeto "%" não é válido.', p_object_type;
    END IF;
    SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type;
    v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;

    -- Tenta encontrar um cliente para associação
    SELECT id INTO v_customer_id FROM public.customers WHERE normalize_text(full_name) = normalize_text(p_recipient_name) LIMIT 1;

    -- Se estiver a editar um objeto existente
    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects SET
            recipient_name = p_recipient_name,
            object_type = p_object_type,
            tracking_code = p_tracking_code,
            customer_id = v_customer_id, -- Associa ao cliente se encontrado
            -- NOVA LÓGICA: Atualiza o endereço direto se fornecido
            delivery_street_name = p_street_name,
            delivery_address_number = p_number,
            delivery_neighborhood = p_neighborhood,
            delivery_city_name = p_city_name,
            delivery_state_uf = p_state_uf,
            delivery_cep = p_cep,
            -- Se nenhum endereço for fornecido, usa o do cliente como fallback
            delivery_address_id = CASE WHEN p_street_name IS NULL THEN (SELECT address_id FROM customers WHERE id = v_customer_id) ELSE NULL END,
            updated_at = NOW()
        WHERE control_number = p_control_number
        RETURNING * INTO result_object;
    ELSE
    -- Se estiver a criar um novo objeto
        INSERT INTO public.objects (
            recipient_name, object_type, storage_deadline, tracking_code, customer_id,
            delivery_street_name, delivery_address_number, delivery_neighborhood,
            delivery_city_name, delivery_state_uf, delivery_cep, delivery_address_id
        )
        VALUES (
            p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id,
            -- NOVA LÓGICA: Insere o endereço direto se fornecido
            p_street_name, p_number, p_neighborhood, p_city_name, p_state_uf, p_cep,
            -- Se nenhum endereço for fornecido, usa o do cliente como fallback
            CASE WHEN p_street_name IS NULL THEN (SELECT address_id FROM customers WHERE id = v_customer_id) ELSE NULL END
        )
        RETURNING * INTO result_object;
    END IF;

    RETURN result_object;
END;
$$;
