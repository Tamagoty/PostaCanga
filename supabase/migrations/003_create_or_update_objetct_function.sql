-- Arquivo: supabase/migrations/003_create_or_update_object_function.sql
-- Descrição: Função RPC para criar ou atualizar um objeto de forma segura.

CREATE OR REPLACE FUNCTION create_or_update_object(
    p_recipient_name TEXT,
    p_object_type TEXT,
    p_storage_deadline DATE,
    p_tracking_code TEXT DEFAULT NULL,
    p_control_number INT DEFAULT NULL -- Passe um control_number para atualizar, ou NULL para criar
)
RETURNS objects -- Retorna a linha completa da tabela 'objects'
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com os privilégios do criador da função, contornando RLS se necessário, mas as políticas ainda se aplicam.
AS $$
DECLARE
    v_customer_id UUID;
    result_object objects;
BEGIN
    -- 1. Tenta encontrar um cliente com o nome do destinatário.
    --    Para evitar ambiguidades, pegamos o primeiro que encontrar.
    --    Uma lógica mais robusta pode ser implementada no futuro.
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE full_name ILIKE p_recipient_name
    LIMIT 1;

    -- 2. Se for uma atualização (p_control_number não é nulo)
    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects
        SET
            recipient_name = p_recipient_name,
            object_type = p_object_type,
            storage_deadline = p_storage_deadline,
            tracking_code = p_tracking_code,
            customer_id = v_customer_id, -- Atualiza o customer_id também
            updated_at = NOW()
        WHERE control_number = p_control_number
        RETURNING * INTO result_object;
    -- 3. Se for uma criação (p_control_number é nulo)
    ELSE
        INSERT INTO public.objects (
            recipient_name,
            object_type,
            storage_deadline,
            tracking_code,
            customer_id,
            arrival_date, -- Data de chegada é a data atual por padrão no schema
            status
        )
        VALUES (
            p_recipient_name,
            p_object_type,
            p_storage_deadline,
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
