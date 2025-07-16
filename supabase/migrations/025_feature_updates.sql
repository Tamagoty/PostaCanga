-- Arquivo: supabase/migrations/025_feature_updates.sql
-- Descrição: Implementa o arquivamento de objetos e a gestão de endereço no objeto.

-- Etapa 1: Adicionar a coluna de arquivamento à tabela de objetos.
ALTER TABLE public.objects
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.objects.is_archived IS 'Se TRUE, o objeto não aparece na lista principal.';


-- Etapa 2: Criar uma função para arquivar todos os objetos concluídos.
CREATE OR REPLACE FUNCTION archive_completed_objects()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Apenas administradores podem executar esta ação.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    UPDATE public.objects
    SET is_archived = TRUE
    WHERE status IN ('Entregue', 'Devolvido') AND is_archived = FALSE;
END;
$$;


-- Etapa 3: Criar uma função para reativar um objeto baixado por erro.
CREATE OR REPLACE FUNCTION unarchive_object(p_control_number INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    UPDATE public.objects
    SET 
        status = 'Aguardando Retirada',
        is_archived = FALSE
    WHERE control_number = p_control_number;
END;
$$;


-- Etapa 4: Atualizar a função de criar/atualizar objeto para incluir o endereço.
CREATE OR REPLACE FUNCTION create_or_update_object(
    p_recipient_name TEXT,
    p_object_type TEXT,
    p_tracking_code TEXT DEFAULT NULL,
    p_control_number INT DEFAULT NULL,
    p_cep TEXT DEFAULT NULL,
    p_street_type TEXT DEFAULT NULL,
    p_street_name TEXT DEFAULT NULL,
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
    -- Lógica de prazo de guarda
    v_storage_deadline := CURRENT_DATE + CASE
        WHEN p_object_type IN ('SEDEX', 'Encomenda PAC', 'Telegrama', 'Outro') THEN INTERVAL '7 days'
        ELSE INTERVAL '20 days'
    END;

    -- Lógica de busca de cliente
    SELECT id INTO v_customer_id FROM public.customers WHERE full_name ILIKE p_recipient_name LIMIT 1;

    -- Lógica de criação de endereço para o objeto, se fornecido
    IF p_street_name IS NOT NULL AND p_city IS NOT NULL THEN
        INSERT INTO public.addresses (cep, street_type, street_name, neighborhood, city, state)
        VALUES (p_cep, p_street_type, p_street_name, p_neighborhood, p_city, p_state)
        RETURNING id INTO v_address_id;
    ELSE
        v_address_id := NULL;
    END IF;

    -- Criação/Atualização do Objeto
    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects
        SET
            recipient_name = p_recipient_name,
            object_type = p_object_type,
            tracking_code = p_tracking_code,
            customer_id = v_customer_id,
            -- Não atualizamos o endereço ao editar por simplicidade, mas poderia ser adicionado.
            updated_at = NOW()
        WHERE control_number = p_control_number
        RETURNING * INTO result_object;
    ELSE
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_address_id, arrival_date, status)
        VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, v_address_id, CURRENT_DATE, 'Aguardando Retirada')
        RETURNING * INTO result_object;
    END IF;

    RETURN result_object;
END;
$$;
