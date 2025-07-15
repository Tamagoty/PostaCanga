-- Arquivo: supabase/migrations/005_update_object_function_with_deadline.sql
-- Descrição: Altera a função RPC para calcular o prazo de guarda automaticamente.

CREATE OR REPLACE FUNCTION create_or_update_object(
    p_recipient_name TEXT,
    p_object_type TEXT,
    -- p_storage_deadline DATE, -- REMOVIDO: O prazo agora é calculado internamente.
    p_tracking_code TEXT DEFAULT NULL,
    p_control_number INT DEFAULT NULL
)
RETURNS objects
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_storage_deadline DATE;
    result_object objects;
BEGIN
    -- 1. Calcula o prazo de guarda com base no tipo de objeto e na data atual.
    v_storage_deadline := CURRENT_DATE + CASE
        WHEN p_object_type IN ('SEDEX', 'Encomenda PAC', 'Telegrama', 'Outro') THEN INTERVAL '7 days'
        WHEN p_object_type IN ('Carta Registrada', 'Carta Simples', 'Revista', 'Cartão') THEN INTERVAL '20 days'
        ELSE INTERVAL '7 days' -- Prazo padrão para tipos não listados.
    END;

    -- 2. Tenta encontrar um cliente com o nome do destinatário.
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE full_name ILIKE p_recipient_name
    LIMIT 1;

    -- 3. Se for uma atualização (p_control_number não é nulo)
    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects
        SET
            recipient_name = p_recipient_name,
            object_type = p_object_type,
            -- storage_deadline = v_storage_deadline, -- Opcional: decidir se a edição de um objeto deve recalcular o prazo. Por ora, não vamos alterar o prazo original.
            tracking_code = p_tracking_code,
            customer_id = v_customer_id,
            updated_at = NOW()
        WHERE control_number = p_control_number
        RETURNING * INTO result_object;
    -- 4. Se for uma criação (p_control_number é nulo)
    ELSE
        INSERT INTO public.objects (
            recipient_name,
            object_type,
            storage_deadline, -- Usa o valor calculado
            tracking_code,
            customer_id,
            arrival_date,
            status
        )
        VALUES (
            p_recipient_name,
            p_object_type,
            v_storage_deadline, -- Usa o valor calculado
            p_tracking_code,
            v_customer_id,
            CURRENT_DATE,
            'Aguardando Retirada'
        )
        RETURNING * INTO result_object;
    END IF;

    RETURN result_object;
END;
$$;
