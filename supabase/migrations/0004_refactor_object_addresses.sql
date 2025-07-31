-- ARQUIVO: 0004_refactor_object_addresses.sql
-- DESCRIÇÃO: Altera a estrutura da tabela 'objects' e a lógica de criação de objetos
--            para suportar endereços não associados a clientes.

-- 1. Adiciona colunas de endereço diretamente na tabela de objetos.
--    Estes campos serão usados para objetos cujo destinatário não é um cliente registado.
ALTER TABLE public.objects
ADD COLUMN IF NOT EXISTS delivery_street_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_number TEXT,
ADD COLUMN IF NOT EXISTS delivery_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS delivery_city_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_state_uf CHAR(2),
ADD COLUMN IF NOT EXISTS delivery_cep VARCHAR(9);

-- 2. Recria a função `create_or_update_object` com a nova lógica.
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
    -- Valida o tipo de objeto e calcula o prazo de guarda
    IF NOT EXISTS (SELECT 1 FROM public.object_types WHERE name = p_object_type) THEN
        RAISE EXCEPTION 'O tipo de objeto "%" não é válido.', p_object_type;
    END IF;
    SELECT default_storage_days INTO v_storage_days FROM public.object_types WHERE name = p_object_type;
    v_storage_deadline := CURRENT_DATE + (v_storage_days || ' days')::INTERVAL;

    -- Tenta encontrar um cliente registado com o nome do destinatário
    SELECT id INTO v_customer_id FROM public.customers WHERE normalize_text(full_name) = normalize_text(p_recipient_name) LIMIT 1;

    -- LÓGICA PRINCIPAL:
    -- Se um cliente for encontrado, o objeto é associado a ele e ao seu endereço principal.
    IF v_customer_id IS NOT NULL THEN
        SELECT address_id INTO v_address_id FROM public.customers WHERE id = v_customer_id;
        
        -- Se estiver a editar, atualiza o objeto
        IF p_control_number IS NOT NULL THEN
            UPDATE public.objects SET
                recipient_name = p_recipient_name, object_type = p_object_type, tracking_code = p_tracking_code,
                customer_id = v_customer_id, delivery_address_id = v_address_id, updated_at = NOW()
            WHERE control_number = p_control_number
            RETURNING * INTO result_object;
        ELSE
        -- Se estiver a criar, insere um novo objeto associado ao cliente
            INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_address_id)
            VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, v_address_id)
            RETURNING * INTO result_object;
        END IF;
    ELSE
    -- Se NENHUM cliente for encontrado, o endereço é guardado diretamente no objeto, sem poluir a tabela `addresses`.
        -- Se estiver a editar
        IF p_control_number IS NOT NULL THEN
             UPDATE public.objects SET
                recipient_name = p_recipient_name, object_type = p_object_type, tracking_code = p_tracking_code,
                customer_id = NULL, delivery_address_id = NULL, -- Garante que não há links para tabelas principais
                delivery_street_name = p_street_name, delivery_address_number = p_number, delivery_neighborhood = p_neighborhood,
                delivery_city_name = p_city_name, delivery_state_uf = p_state_uf, delivery_cep = p_cep,
                updated_at = NOW()
            WHERE control_number = p_control_number
            RETURNING * INTO result_object;
        ELSE
        -- Se estiver a criar
            INSERT INTO public.objects (
                recipient_name, object_type, storage_deadline, tracking_code,
                delivery_street_name, delivery_address_number, delivery_neighborhood,
                delivery_city_name, delivery_state_uf, delivery_cep
            )
            VALUES (
                p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code,
                p_street_name, p_number, p_neighborhood, p_city_name, p_state_uf, p_cep
            )
            RETURNING * INTO result_object;
        END IF;
    END IF;

    RETURN result_object;
END;
$$;
