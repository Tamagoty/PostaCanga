-- Arquivo: supabase/migrations/042_create_get_phones_function.sql
-- Descrição: Cria uma função RPC para buscar de forma eficiente os números de telefone
--            para uma lista de nomes de destinatários.

-- Etapa 1: Garantir que a nossa função de normalização de texto existe.
CREATE OR REPLACE FUNCTION normalize_text(p_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN trim(regexp_replace(lower(unaccent(p_text)), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Etapa 2: Criar a nova função que recebe um array de nomes.
CREATE OR REPLACE FUNCTION get_phones_for_recipients(
    p_recipient_names TEXT[]
)
RETURNS JSONB -- Retorna um objeto JSON, ex: {"Nome": "telefone", ...}
LANGUAGE plpgsql
AS $$
DECLARE
    v_name TEXT;
    v_phone TEXT;
    v_result JSONB := '{}'::jsonb;
    v_customer RECORD;
    v_contact_customer RECORD;
BEGIN
    -- Itera sobre cada nome fornecido na lista de entrada
    FOREACH v_name IN ARRAY p_recipient_names
    LOOP
        v_phone := NULL; -- Reseta o telefone para cada nome

        -- Encontra o cliente principal correspondente ao nome normalizado
        SELECT * INTO v_customer
        FROM public.customers
        WHERE normalize_text(full_name) = normalize_text(v_name) AND is_active = TRUE
        LIMIT 1;

        -- Se um cliente for encontrado
        IF FOUND THEN
            -- Verifica se ele tem um número de telefone direto
            IF v_customer.cellphone IS NOT NULL THEN
                v_phone := v_customer.cellphone;
            -- Se não, verifica se tem um contato associado
            ELSIF v_customer.contact_customer_id IS NOT NULL THEN
                -- Encontra o cliente de contato
                SELECT * INTO v_contact_customer
                FROM public.customers
                WHERE id = v_customer.contact_customer_id AND is_active = TRUE;

                -- Se o contato for encontrado e tiver um telefone, usa-o
                IF FOUND AND v_contact_customer.cellphone IS NOT NULL THEN
                    v_phone := v_contact_customer.cellphone;
                END IF;
            END IF;
        END IF;

        -- Adiciona o nome e o telefone encontrado (ou nulo) ao objeto JSON de resultado
        v_result := v_result || jsonb_build_object(v_name, v_phone);
    END LOOP;

    RETURN v_result;
END;
$$;
