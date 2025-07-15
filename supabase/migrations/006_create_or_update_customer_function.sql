-- Arquivo: supabase/migrations/006_create_or_update_customer_function.sql
-- Descrição: Função RPC para criar ou atualizar um cliente e seu endereço associado.

CREATE OR REPLACE FUNCTION create_or_update_customer(
    p_customer_id UUID, -- Forneça um ID para atualizar, ou NULL para criar um novo.
    p_full_name TEXT,
    p_cpf TEXT,
    p_cellphone TEXT,
    p_birth_date DATE,
    p_address_id UUID, -- ID do endereço existente, se houver.
    p_cep TEXT,
    p_street_type TEXT,
    p_street_name TEXT,
    p_neighborhood TEXT,
    p_city TEXT,
    p_state TEXT
)
RETURNS customers -- Retorna o registro completo do cliente.
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_address_id UUID;
    result_customer customers;
BEGIN
    -- Etapa 1: Gerenciar o endereço.
    -- Se detalhes do endereço foram fornecidos, cria ou atualiza o registro na tabela 'addresses'.
    IF p_street_name IS NOT NULL AND p_city IS NOT NULL AND p_street_name <> '' AND p_city <> '' THEN
        IF p_address_id IS NOT NULL THEN
            -- Atualiza um endereço existente.
            UPDATE public.addresses
            SET
                cep = p_cep,
                street_type = p_street_type,
                street_name = p_street_name,
                neighborhood = p_neighborhood,
                city = p_city,
                state = p_state,
                updated_at = NOW()
            WHERE id = p_address_id
            RETURNING id INTO v_new_address_id;
        ELSE
            -- Insere um novo endereço.
            INSERT INTO public.addresses (cep, street_type, street_name, neighborhood, city, state)
            VALUES (p_cep, p_street_type, p_street_name, p_neighborhood, p_city, p_state)
            RETURNING id INTO v_new_address_id;
        END IF;
    ELSE
        -- Se não houver detalhes de endereço, o ID do endereço será nulo.
        v_new_address_id := NULL;
    END IF;

    -- Etapa 2: Criar ou atualizar o cliente.
    IF p_customer_id IS NOT NULL THEN
        -- Atualiza um cliente existente.
        UPDATE public.customers
        SET
            full_name = p_full_name,
            cpf = p_cpf,
            cellphone = p_cellphone,
            birth_date = p_birth_date,
            address_id = v_new_address_id,
            updated_at = NOW()
        WHERE id = p_customer_id
        RETURNING * INTO result_customer;
    ELSE
        -- Insere um novo cliente.
        INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, address_id)
        VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, v_new_address_id)
        RETURNING * INTO result_customer;
    END IF;

    RETURN result_customer;
END;
$$;
