-- Arquivo: supabase/migrations/062_create_supplies_report_function.sql
-- Descrição: Cria a função para gerar o relatório de uso de material de expediente.

CREATE OR REPLACE FUNCTION get_supplies_usage_report(p_months INT DEFAULT 3)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    report_data JSON;
    v_start_date DATE;
BEGIN
    -- Apenas administradores podem gerar relatórios.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RETURN '[]'::json;
    END IF;

    -- Define a data de início para o cálculo (ex: 3 meses atrás).
    v_start_date := (NOW() - (p_months || ' months')::INTERVAL)::DATE;

    WITH usage_stats AS (
        -- Calcula o total consumido para cada item no período.
        SELECT
            l.supply_id,
            SUM(ABS(l.quantity_changed)) AS total_consumed
        FROM public.supply_stock_log l
        WHERE l.quantity_changed < 0 AND l.created_at >= v_start_date
        GROUP BY l.supply_id
    )
    -- Junta os dados de consumo com os dados atuais de estoque para fazer os cálculos.
    SELECT json_agg(t.*) INTO report_data FROM (
        SELECT
            s.name AS supply_name,
            COALESCE(us.total_consumed, 0)::int AS total_consumed,
            s.stock AS current_stock,
            -- Calcula a média mensal de consumo.
            (COALESCE(us.total_consumed, 0) / p_months)::decimal(10, 2) AS monthly_avg,
            -- Calcula a sugestão de compra para ter estoque para 3 meses.
            GREATEST(0, CEIL((COALESCE(us.total_consumed, 0) / p_months) * 3) - s.stock)::int AS suggestion
        FROM public.office_supplies s
        LEFT JOIN usage_stats us ON s.id = us.supply_id
        ORDER BY total_consumed DESC
    ) t;

    RETURN COALESCE(report_data, '[]'::json);
END;
$$;
