-- Arquivo: supabase/migrations/036_finalize_address_customer_schema.sql
-- Descrição: Move o campo 'number' da tabela de endereços para a de clientes.

-- Etapa 1: Apagar funções que dependem da estrutura antiga para evitar erros.
DROP FUNCTION IF EXISTS public.create_or_update_address(uuid, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_or_update_customer(uuid, text, text, text, date, uuid, text, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_customer_details(uuid);

-- Etapa 2: Remover a coluna 'number' da tabela de endereços, se ela ainda existir.
ALTER TABLE public.addresses
DROP COLUMN IF EXISTS "number";

-- Etapa 3: Adicionar as colunas 'address_number' e 'address_complement' à tabela de clientes.
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);

-- Etapa 4: Recriar as funções com a nova estrutura correta.

-- Função para criar/atualizar um endereço (agora sem o número).
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

-- Função para criar/atualizar um cliente (agora com número e complemento).
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

-- Função para buscar os detalhes do cliente (agora busca o número do perfil do cliente).
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_profile JSON;
    v_customer_objects JSON;
BEGIN
    SELECT
        json_build_object(
            'id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone,
            'birth_date', c.birth_date, 'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id,
            'email', c.email, 'address_id', c.address_id, 'address_number', c.address_number,
            'address_complement', c.address_complement,
            'address', json_build_object(
                'street_name', a.street_name,
                'neighborhood', a.neighborhood,
                'cep', a.cep,
                'city', ci.name,
                'state', s.uf
            )
        )
    INTO v_customer_profile
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    LEFT JOIN public.cities ci ON a.city_id = ci.id
    LEFT JOIN public.states s ON ci.state_id = s.id
    WHERE c.id = p_customer_id;

    SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o
    WHERE o.recipient_name ILIKE (SELECT full_name FROM public.customers WHERE id = p_customer_id);

    RETURN json_build_object('profile', v_customer_profile, 'objects', COALESCE(v_customer_objects, '[]'::json));
END;
$$;
