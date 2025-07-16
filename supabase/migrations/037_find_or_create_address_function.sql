-- Arquivo: supabase/migrations/037_find_or_create_address_function.sql
-- Descrição: Cria uma função RPC para encontrar um endereço existente pelo CEP ou criar um novo.

CREATE OR REPLACE FUNCTION find_or_create_address_by_cep(
    p_cep TEXT,
    p_street_name TEXT,
    p_neighborhood TEXT,
    p_city_name TEXT,
    p_state_uf TEXT
)
RETURNS UUID -- Retorna o ID do endereço (existente ou novo)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_address_id UUID;
    v_city_id INT;
BEGIN
    -- Etapa 1: Tenta encontrar um endereço que já corresponda ao CEP e ao logradouro.
    SELECT id INTO v_address_id
    FROM public.addresses
    WHERE cep = p_cep AND street_name = p_street_name
    LIMIT 1;

    -- Etapa 2: Se encontrou um endereço, retorna o seu ID imediatamente.
    IF v_address_id IS NOT NULL THEN
        RETURN v_address_id;
    END IF;

    -- Etapa 3: Se não encontrou, procura o ID da cidade correspondente.
    SELECT c.id INTO v_city_id
    FROM public.cities c
    JOIN public.states s ON c.state_id = s.id
    WHERE c.name ILIKE p_city_name AND s.uf = p_state_uf
    LIMIT 1;

    -- Se a cidade não existir na nossa base de dados, lança um erro.
    IF v_city_id IS NULL THEN
        RAISE EXCEPTION 'A cidade e o estado retornados pelo CEP não foram encontrados no nosso banco de dados.';
    END IF;

    -- Etapa 4: Cria o novo endereço e retorna o ID recém-criado.
    INSERT INTO public.addresses (cep, street_name, neighborhood, city_id)
    VALUES (p_cep, p_street_name, p_neighborhood, v_city_id)
    RETURNING id INTO v_address_id;

    RETURN v_address_id;
END;
$$;
