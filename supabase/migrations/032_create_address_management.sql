-- Arquivo: supabase/migrations/032_create_address_management.sql
-- Descrição: Cria funções para a gestão centralizada de endereços e simplifica a gestão de clientes.

-- Etapa 1: Criar uma função para criar ou atualizar um endereço.
CREATE OR REPLACE FUNCTION create_or_update_address(
    p_address_id UUID, -- Forneça um ID para atualizar, ou NULL para criar.
    p_cep TEXT,
    p_street_type TEXT,
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
        SET cep=p_cep, street_type=p_street_type, street_name=p_street_name, "number"=p_number, neighborhood=p_neighborhood, city=p_city, state=p_state, updated_at=NOW()
        WHERE id = p_address_id;
    ELSE
        INSERT INTO public.addresses (cep, street_type, street_name, "number", neighborhood, city, state)
        VALUES (p_cep, p_street_type, p_street_name, p_number, p_neighborhood, p_city, p_state);
    END IF;
END;
$$;

-- Etapa 2: Criar uma função para apagar um endereço, com verificação de segurança.
CREATE OR REPLACE FUNCTION delete_address(p_address_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se o endereço não está a ser usado por nenhum cliente.
    IF EXISTS (SELECT 1 FROM public.customers WHERE address_id = p_address_id) THEN
        RAISE EXCEPTION 'Não é possível apagar o endereço, pois está associado a um ou mais clientes.';
    END IF;

    -- Verifica se o endereço não está a ser usado por nenhum objeto.
    IF EXISTS (SELECT 1 FROM public.objects WHERE delivery_address_id = p_address_id) THEN
        RAISE EXCEPTION 'Não é possível apagar o endereço, pois está associado a um ou mais objetos.';
    END IF;

    DELETE FROM public.addresses WHERE id = p_address_id;
END;
$$;

-- Etapa 3: Simplificar a função de criar/atualizar cliente para receber apenas o ID do endereço.
DROP FUNCTION IF EXISTS create_or_update_customer(UUID,TEXT,TEXT,TEXT,DATE,UUID,TEXT,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_customer(
    p_customer_id UUID,
    p_full_name TEXT,
    p_cpf TEXT,
    p_cellphone TEXT,
    p_birth_date DATE,
    p_contact_customer_id UUID,
    p_email TEXT,
    p_address_id UUID -- O único parâmetro de endereço necessário
)
RETURNS customers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_customer customers;
BEGIN
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET full_name=p_full_name, cpf=p_cpf, cellphone=p_cellphone, birth_date=p_birth_date, contact_customer_id=p_contact_customer_id, email=p_email, address_id=p_address_id, updated_at=NOW()
        WHERE id = p_customer_id RETURNING * INTO result_customer;
    ELSE
        INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, contact_customer_id, email, address_id)
        VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, p_contact_customer_id, p_email, p_address_id)
        RETURNING * INTO result_customer;
    END IF;
    RETURN result_customer;
END;
$$;
