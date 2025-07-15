-- Arquivo: supabase/migrations/008_update_customer_function_with_contact.sql
-- Descrição: Atualiza a função RPC para gerenciar o novo campo de contato.

CREATE OR REPLACE FUNCTION create_or_update_customer(
    p_customer_id UUID,
    p_full_name TEXT,
    p_cpf TEXT,
    p_cellphone TEXT,
    p_birth_date DATE,
    p_contact_customer_id UUID, -- NOVO PARÂMETRO
    p_address_id UUID,
    p_cep TEXT,
    p_street_type TEXT,
    p_street_name TEXT,
    p_neighborhood TEXT,
    p_city TEXT,
    p_state TEXT
)
RETURNS customers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_address_id UUID;
    result_customer customers;
BEGIN
    -- Etapa 1: Gerenciar o endereço (lógica inalterada).
    IF p_street_name IS NOT NULL AND p_city IS NOT NULL AND p_street_name <> '' AND p_city <> '' THEN
        IF p_address_id IS NOT NULL THEN
            UPDATE public.addresses SET cep=p_cep, street_type=p_street_type, street_name=p_street_name, neighborhood=p_neighborhood, city=p_city, state=p_state, updated_at=NOW()
            WHERE id = p_address_id RETURNING id INTO v_new_address_id;
        ELSE
            INSERT INTO public.addresses (cep, street_type, street_name, neighborhood, city, state)
            VALUES (p_cep, p_street_type, p_street_name, p_neighborhood, p_city, p_state)
            RETURNING id INTO v_new_address_id;
        END IF;
    ELSE
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
            contact_customer_id = p_contact_customer_id, -- ATUALIZADO
            address_id = v_new_address_id,
            updated_at = NOW()
        WHERE id = p_customer_id
        RETURNING * INTO result_customer;
    ELSE
        -- Insere um novo cliente.
        INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, contact_customer_id, address_id)
        VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, p_contact_customer_id, v_new_address_id) -- ATUALIZADO
        RETURNING * INTO result_customer;
    END IF;

    RETURN result_customer;
END;
$$;
