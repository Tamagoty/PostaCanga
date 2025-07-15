-- Arquivo: supabase/migrations/012_create_dashboard_function.sql
-- Descrição: Função RPC para buscar todos os dados agregados para o Dashboard.

CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Variáveis para armazenar os resultados das contagens
    v_awaiting_objects_count INT;
    v_expiring_soon_count INT;
    v_low_stock_count INT;
    -- Variável para armazenar os objetos recentes como um JSON
    v_recent_objects JSON;
BEGIN
    -- 1. Contar objetos aguardando retirada
    SELECT COUNT(*)
    INTO v_awaiting_objects_count
    FROM public.objects
    WHERE status = 'Aguardando Retirada';

    -- 2. Contar objetos com prazo de guarda vencendo nos próximos 3 dias
    SELECT COUNT(*)
    INTO v_expiring_soon_count
    FROM public.objects
    WHERE status = 'Aguardando Retirada'
      AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days');

    -- 3. Contar materiais de expediente com estoque baixo (ex: <= 5 unidades)
    SELECT COUNT(*)
    INTO v_low_stock_count
    FROM public.office_supplies
    WHERE stock <= 5;

    -- 4. Buscar os 5 objetos mais recentes que chegaram
    SELECT json_agg(t)
    INTO v_recent_objects
    FROM (
        SELECT control_number, recipient_name, object_type, arrival_date
        FROM public.objects
        ORDER BY arrival_date DESC, created_at DESC
        LIMIT 5
    ) t;

    -- 5. Retornar todos os dados compilados num único objeto JSON
    RETURN json_build_object(
        'awaiting_count', v_awaiting_objects_count,
        'expiring_count', v_expiring_soon_count,
        'low_stock_count', v_low_stock_count,
        'recent_objects', COALESCE(v_recent_objects, '[]'::json) -- Garante que retorne um array vazio se não houver objetos
    );
END;
$$;
