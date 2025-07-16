-- Arquivo: supabase/migrations/031_add_email_and_number_fields.sql
-- Descrição: Adiciona os campos 'email' e 'número' e atualiza a função de gestão de clientes.

-- Etapa 1: Adicionar a coluna de e-mail à tabela de clientes.
ALTER TABLE public.customers
ADD COLUMN email VARCHAR(255) UNIQUE;

COMMENT ON COLUMN public.customers.email IS 'Endereço de e-mail do cliente.';

-- Etapa 2: Adicionar a coluna de número à tabela de endereços.
ALTER TABLE public.addresses
ADD COLUMN "number" VARCHAR(20); -- Usamos aspas para evitar conflito com a palavra reservada 'number'.

COMMENT ON COLUMN public.addresses.number IS 'Número da residência ou S/N.';


-- Etapa 3: Atualizar a função RPC para incluir os novos campos.
DROP FUNCTION IF EXISTS create_or_update_customer(UUID,TEXT,TEXT,TEXT,DATE,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);

CREATE OR REPLACE FUNCTION create_or_update_customer(
    p_customer_id UUID,
    p_full_name TEXT,
    p_cpf TEXT,
    p_cellphone TEXT,
    p_birth_date DATE,
    p_contact_customer_id UUID,
    p_email TEXT, -- NOVO PARÂMETRO
    p_address_id UUID,
    p_cep TEXT,
    p_street_type TEXT,
    p_street_name TEXT,
    p_number TEXT, -- NOVO PARÂMETRO
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
    -- Gerenciar o endereço
    IF p_street_name IS NOT NULL AND p_city IS NOT NULL AND p_street_name <> '' AND p_city <> '' THEN
        IF p_address_id IS NOT NULL THEN
            UPDATE public.addresses SET cep=p_cep, street_type=p_street_type, street_name=p_street_name, "number"=p_number, neighborhood=p_neighborhood, city=p_city, state=p_state, updated_at=NOW()
            WHERE id = p_address_id RETURNING id INTO v_new_address_id;
        ELSE
            INSERT INTO public.addresses (cep, street_type, street_name, "number", neighborhood, city, state)
            VALUES (p_cep, p_street_type, p_street_name, p_number, p_neighborhood, p_city, p_state)
            RETURNING id INTO v_new_address_id;
        END IF;
    ELSE
        v_new_address_id := NULL;
    END IF;

    -- Criar ou atualizar o cliente
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET full_name=p_full_name, cpf=p_cpf, cellphone=p_cellphone, birth_date=p_birth_date, contact_customer_id=p_contact_customer_id, email=p_email, address_id=v_new_address_id, updated_at=NOW()
        WHERE id = p_customer_id RETURNING * INTO result_customer;
    ELSE
        INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, contact_customer_id, email, address_id)
        VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, p_contact_customer_id, p_email, v_new_address_id)
        RETURNING * INTO result_customer;
    END IF;

    RETURN result_customer;
END;
$$;
