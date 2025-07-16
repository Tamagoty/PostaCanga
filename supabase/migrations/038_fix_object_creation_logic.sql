-- Arquivo: supabase/migrations/038_fix_object_creation_logic.sql
-- Descrição: Corrige a função de criação de objetos para ser compatível
--            com a nova estrutura de endereços normalizada.

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
    p_city_name TEXT DEFAULT NULL, -- Alterado de p_city para p_city_name
    p_state_uf TEXT DEFAULT NULL -- Alterado de p_state para p_state_uf
)
RETURNS objects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_address_id UUID;
    v_city_id INT;
    v_storage_deadline DATE;
    result_object objects;
BEGIN
    v_storage_deadline := CURRENT_DATE + CASE WHEN p_object_type IN ('SEDEX', 'Encomenda PAC', 'Telegrama', 'Outro') THEN INTERVAL '7 days' ELSE INTERVAL '20 days' END;
    
    -- A busca de cliente agora ignora acentos
    SELECT id INTO v_customer_id FROM public.customers WHERE unaccent(full_name) ILIKE unaccent(p_recipient_name) LIMIT 1;

    -- Se foram fornecidos dados de endereço, encontra ou cria o endereço
    IF p_street_name IS NOT NULL AND p_city_name IS NOT NULL THEN
        -- Encontra o ID da cidade
        SELECT c.id INTO v_city_id
        FROM public.cities c
        JOIN public.states s ON c.state_id = s.id
        WHERE c.name ILIKE p_city_name AND s.uf ILIKE p_state_uf
        LIMIT 1;

        -- Se a cidade não for encontrada, lança um erro
        IF v_city_id IS NULL THEN
            RAISE EXCEPTION 'Cidade ou Estado não encontrado no banco de dados: %, %', p_city_name, p_state_uf;
        END IF;

        -- Insere o novo endereço e obtém o seu ID
        INSERT INTO public.addresses (cep, street_name, neighborhood, city_id)
        VALUES (p_cep, p_street_name, p_neighborhood, v_city_id)
        RETURNING id INTO v_address_id;
    ELSE
        v_address_id := NULL;
    END IF;

    -- Cria ou atualiza o objeto
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
