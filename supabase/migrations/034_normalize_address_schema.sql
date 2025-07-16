-- Arquivo: supabase/migrations/034_normalize_address_schema.sql
-- Descrição: Normaliza a estrutura de endereços, criando tabelas para estados e cidades.

-- Etapa 1: Apagar funções que dependem da estrutura antiga para evitar erros.
DROP FUNCTION IF EXISTS public.create_or_update_address(uuid, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_or_update_customer(uuid, text, text, text, date, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_customer_details(uuid);

-- Etapa 2: Criar as novas tabelas para Estados e Cidades.
CREATE TABLE IF NOT EXISTS public.states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id INT NOT NULL REFERENCES public.states(id)
);

-- Etapa 3: Alterar a tabela de endereços para usar a nova estrutura.
ALTER TABLE public.addresses DROP COLUMN IF EXISTS city;
ALTER TABLE public.addresses DROP COLUMN IF EXISTS state;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities(id);

-- Etapa 4: Alterar a tabela de clientes para armazenar o número e complemento.
ALTER TABLE public.customers DROP COLUMN IF EXISTS address_id; -- Será re-adicionado com a referência correta.
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);

-- Etapa 5: Recriar as funções com a nova lógica.

-- Função para criar/atualizar um endereço (agora recebe city_id).
CREATE OR REPLACE FUNCTION create_or_update_address(
    p_address_id UUID, p_cep TEXT, p_street_name TEXT, p_neighborhood TEXT, p_city_id INT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_address_id UUID;
BEGIN
    IF p_address_id IS NOT NULL THEN
        UPDATE public.addresses SET cep=p_cep, street_name=p_street_name, neighborhood=p_neighborhood, city_id=p_city_id, updated_at=NOW()
        WHERE id = p_address_id RETURNING id INTO new_address_id;
    ELSE
        INSERT INTO public.addresses (cep, street_name, neighborhood, city_id)
        VALUES (p_cep, p_street_name, p_neighborhood, p_city_id) RETURNING id INTO new_address_id;
    END IF;
    RETURN new_address_id;
END;
$$;

-- Função para criar/atualizar um cliente (agora recebe address_id, número e complemento).
CREATE OR REPLACE FUNCTION create_or_update_customer(
    p_customer_id UUID, p_full_name TEXT, p_cpf TEXT, p_cellphone TEXT, p_birth_date DATE,
    p_contact_customer_id UUID, p_email TEXT, p_address_id UUID, p_address_number TEXT, p_address_complement TEXT
) RETURNS customers LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result_customer customers;
BEGIN
    IF p_customer_id IS NOT NULL THEN
        UPDATE public.customers SET full_name=p_full_name, cpf=p_cpf, cellphone=p_cellphone, birth_date=p_birth_date,
        contact_customer_id=p_contact_customer_id, email=p_email, address_id=p_address_id, address_number=p_address_number,
        address_complement=p_address_complement, updated_at=NOW()
        WHERE id = p_customer_id RETURNING * INTO result_customer;
    ELSE
        INSERT INTO public.customers (full_name, cpf, cellphone, birth_date, contact_customer_id, email, address_id, address_number, address_complement)
        VALUES (p_full_name, p_cpf, p_cellphone, p_birth_date, p_contact_customer_id, p_email, p_address_id, p_address_number, p_address_complement)
        RETURNING * INTO result_customer;
    END IF;
    RETURN result_customer;
END;
$$;
