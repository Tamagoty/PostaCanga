-- Arquivo: supabase/migrations/033_simplify_address_structure.sql
-- Descrição: Simplifica a tabela de endereços removendo 'street_type' e atualiza as funções.

-- Etapa 1: Remover a coluna 'street_type' da tabela de endereços.
ALTER TABLE public.addresses
DROP COLUMN IF EXISTS street_type;

-- Etapa 2: Atualizar a função para criar/atualizar um endereço.
DROP FUNCTION IF EXISTS create_or_update_address(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_address(
    p_address_id UUID,
    p_cep TEXT,
    p_street_name TEXT,
    p_number TEXT,
    p_neighborhood TEXT,
    p_city TEXT,
    p_state TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_address_id IS NOT NULL THEN
        UPDATE public.addresses
        SET cep=p_cep, street_name=p_street_name, "number"=p_number, neighborhood=p_neighborhood, city=p_city, state=p_state, updated_at=NOW()
        WHERE id = p_address_id;
    ELSE
        INSERT INTO public.addresses (cep, street_name, "number", neighborhood, city, state)
        VALUES (p_cep, p_street_name, p_number, p_neighborhood, p_city, p_state);
    END IF;
END;
$$;

-- Etapa 3: Atualizar a função de criar/atualizar objeto para remover o parâmetro de tipo de logradouro.
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
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL
)
RETURNS objects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_address_id UUID;
    v_storage_deadline DATE;
    result_object objects;
BEGIN
    v_storage_deadline := CURRENT_DATE + CASE WHEN p_object_type IN ('SEDEX', 'Encomenda PAC', 'Telegrama', 'Outro') THEN INTERVAL '7 days' ELSE INTERVAL '20 days' END;
    SELECT id INTO v_customer_id FROM public.customers WHERE full_name ILIKE p_recipient_name LIMIT 1;

    IF p_street_name IS NOT NULL AND p_city IS NOT NULL THEN
        INSERT INTO public.addresses (cep, street_name, "number", neighborhood, city, state)
        VALUES (p_cep, p_street_name, p_number, p_neighborhood, p_city, p_state)
        RETURNING id INTO v_address_id;
    ELSE
        v_address_id := NULL;
    END IF;

    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects SET recipient_name=p_recipient_name, object_type=p_object_type, tracking_code=p_tracking_code, customer_id=v_customer_id, updated_at=NOW()
        WHERE control_number = p_control_number RETURNING * INTO result_object;
    ELSE
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_address_id, arrival_date, status)
        VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, v_address_id, CURRENT_DATE, 'Aguardando Retirada')
        RETURNING * INTO result_object;
    END IF;

    RETURN result_object;
END;
$$;
