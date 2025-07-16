-- Arquivo: supabase/migrations/038_normalize_names_and_searches.sql
-- Descrição: Corrige a capitalização dos nomes dos clientes e torna as buscas
--            imunes a acentos e cedilhas.

-- Etapa 1: Instalar a extensão 'unaccent' se ela ainda não existir.
-- Isto permite que as buscas ignorem acentos (ex: "João" = "Joao").
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- Etapa 2: Criar uma função para formatar nomes próprios (Proper Case).
-- Esta função irá capitalizar a primeira letra de cada nome, exceto conectivos comuns.
CREATE OR REPLACE FUNCTION proper_case(p_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    word TEXT;
    exceptions TEXT[] := ARRAY['da', 'de', 'do', 'dos'];
BEGIN
    IF p_text IS NULL THEN
        RETURN NULL;
    END IF;

    FOREACH word IN ARRAY string_to_array(lower(p_text), ' ')
    LOOP
        IF word = ANY(exceptions) THEN
            result := result || ' ' || word;
        ELSE
            result := result || ' ' || upper(substring(word from 1 for 1)) || lower(substring(word from 2));
        END IF;
    END LOOP;

    RETURN trim(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Etapa 3: Aplicar a nova função para corrigir todos os nomes na tabela de clientes.
-- Este comando irá atualizar todos os registos de uma só vez.
UPDATE public.customers
SET full_name = proper_case(full_name);


-- Etapa 4: Atualizar as funções que associam objetos a clientes para usar 'unaccent'.
-- Isto garante que um objeto para "JOAO SILVA" seja associado ao cliente "João Silva".

-- Função para criar/atualizar objeto
DROP FUNCTION IF EXISTS create_or_update_object(TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION create_or_update_object(
    p_recipient_name TEXT, p_object_type TEXT, p_tracking_code TEXT DEFAULT NULL, p_control_number INT DEFAULT NULL,
    p_cep TEXT DEFAULT NULL, p_street_name TEXT DEFAULT NULL, p_number TEXT DEFAULT NULL, p_neighborhood TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL
)
RETURNS objects LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_customer_id UUID; v_address_id UUID; v_storage_deadline DATE; result_object objects;
BEGIN
    v_storage_deadline := CURRENT_DATE + CASE WHEN p_object_type IN ('SEDEX', 'Encomenda PAC', 'Telegrama', 'Outro') THEN INTERVAL '7 days' ELSE INTERVAL '20 days' END;
    
    -- CORREÇÃO: A busca agora ignora acentos e diferenças de maiúsculas/minúsculas.
    SELECT id INTO v_customer_id FROM public.customers WHERE unaccent(full_name) ILIKE unaccent(p_recipient_name) LIMIT 1;

    IF p_street_name IS NOT NULL AND p_city IS NOT NULL THEN
        INSERT INTO public.addresses (cep, street_name, "number", neighborhood, city, state)
        VALUES (p_cep, p_street_name, p_number, p_neighborhood, p_city, p_state)
        RETURNING id INTO v_address_id;
    ELSE v_address_id := NULL;
    END IF;

    IF p_control_number IS NOT NULL THEN
        UPDATE public.objects SET recipient_name=p_recipient_name, object_type=p_object_type, tracking_code=p_tracking_code, customer_id=v_customer_id, updated_at=NOW()
        WHERE control_number = p_control_number RETURNING * INTO result_object;
    ELSE
        INSERT INTO public.objects (recipient_name, object_type, storage_deadline, tracking_code, customer_id, delivery_address_id, arrival_date, status)
        VALUES (p_recipient_name, p_object_type, v_storage_deadline, p_tracking_code, v_customer_id, v_address_id, CURRENT_DATE, 'Aguardando Retirada')
        RETURNING * INTO result_object;
    END IF;
    RETURN result_object;
END;
$$;


-- Função para buscar detalhes do cliente
DROP FUNCTION IF EXISTS get_customer_details(UUID);
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_customer_profile JSON; v_customer_objects JSON;
BEGIN
    SELECT json_build_object(
            'id', c.id, 'full_name', c.full_name, 'cpf', c.cpf, 'cellphone', c.cellphone, 'birth_date', c.birth_date,
            'is_active', c.is_active, 'contact_customer_id', c.contact_customer_id, 'email', c.email, 'address_id', c.address_id,
            'address_number', c.address_number, 'address_complement', c.address_complement,
            'address', json_build_object('street_name', a.street_name, 'neighborhood', a.neighborhood, 'cep', a.cep, 'city', ci.name, 'state', s.uf)
        )
    INTO v_customer_profile
    FROM public.customers c
    LEFT JOIN public.addresses a ON c.address_id = a.id
    LEFT JOIN public.cities ci ON a.city_id = ci.id
    LEFT JOIN public.states s ON ci.state_id = s.id
    WHERE c.id = p_customer_id;

    -- CORREÇÃO: A busca de objetos agora também ignora acentos.
    SELECT json_agg(o.*) INTO v_customer_objects FROM public.objects o
    WHERE unaccent(o.recipient_name) ILIKE unaccent((SELECT full_name FROM public.customers WHERE id = p_customer_id));

    RETURN json_build_object('profile', v_customer_profile, 'objects', COALESCE(v_customer_objects, '[]'::json));
END;
$$;
