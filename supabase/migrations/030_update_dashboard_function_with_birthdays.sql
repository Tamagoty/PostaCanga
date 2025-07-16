-- Arquivo: supabase/migrations/030_update_dashboard_function_with_birthdays.sql
-- Descrição: Altera a função do Dashboard para incluir uma lista de aniversariantes do mês.

-- Apaga a função antiga para garantir que a nova possa ser criada sem conflitos.
DROP FUNCTION IF EXISTS public.get_dashboard_data();

CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_awaiting_objects_count INT;
    v_expiring_soon_count INT;
    v_low_stock_count INT;
    v_recent_objects JSON;
    v_upcoming_birthdays JSON; -- Nova variável para os aniversariantes
BEGIN
    -- 1. Contagens de objetos e estoque (lógica inalterada)
    SELECT COUNT(*) INTO v_awaiting_objects_count FROM public.objects WHERE status = 'Aguardando Retirada';
    SELECT COUNT(*) INTO v_expiring_soon_count FROM public.objects WHERE status = 'Aguardando Retirada' AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days');
    SELECT COUNT(*) INTO v_low_stock_count FROM public.office_supplies WHERE stock <= 5;

    -- 2. Busca de objetos recentes (lógica inalterada)
    SELECT json_agg(t) INTO v_recent_objects FROM (
        SELECT control_number, recipient_name, object_type, arrival_date FROM public.objects
        ORDER BY arrival_date DESC, created_at DESC LIMIT 5
    ) t;

    -- 3. Nova Lógica: Buscar aniversariantes do mês corrente.
    SELECT json_agg(b)
    INTO v_upcoming_birthdays
    FROM (
        SELECT
            id,
            full_name,
            birth_date,
            EXTRACT(DAY FROM birth_date) as birthday_day
        FROM
            public.customers
        WHERE
            is_active = TRUE AND
            birth_date IS NOT NULL AND
            EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        ORDER BY
            birthday_day
    ) b;

    -- 4. Retornar todos os dados compilados num único objeto JSON
    RETURN json_build_object(
        'awaiting_count', v_awaiting_objects_count,
        'expiring_count', v_expiring_soon_count,
        'low_stock_count', v_low_stock_count,
        'recent_objects', COALESCE(v_recent_objects, '[]'::json),
        'upcoming_birthdays', COALESCE(v_upcoming_birthdays, '[]'::json) -- Adiciona os aniversariantes ao resultado
    );
END;
$$;
