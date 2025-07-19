-- Arquivo: supabase/migrations/061_create_reports_system.sql
-- Descrição: Cria as funções iniciais para o módulo de relatórios.

CREATE OR REPLACE FUNCTION get_monthly_objects_report(p_year INT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    report_data JSON;
BEGIN
    -- Apenas administradores podem gerar relatórios.
    IF (SELECT get_my_role()) <> 'admin' THEN
        RETURN '[]'::json;
    END IF;

    WITH months AS (
        -- Gera uma série de todos os 12 meses para o ano especificado.
        SELECT generate_series(
            make_date(p_year, 1, 1),
            make_date(p_year, 12, 1),
            '1 month'
        )::date AS month_start
    ),
    monthly_stats AS (
        -- Calcula as estatísticas de objetos para cada mês.
        SELECT
            date_trunc('month', o.created_at)::date AS month,
            COUNT(*) AS criados,
            COUNT(*) FILTER (WHERE o.status = 'Entregue') AS entregues,
            COUNT(*) FILTER (WHERE o.status = 'Devolvido') AS devolvidos
        FROM public.objects o
        WHERE EXTRACT(YEAR FROM o.created_at) = p_year
        GROUP BY month
    )
    -- Junta os meses com as estatísticas para garantir que todos os meses apareçam.
    SELECT json_agg(t.*) INTO report_data FROM (
        SELECT
            to_char(m.month_start, 'Mon') AS mes, -- 'Mon' para abreviação do mês (ex: Jan, Fev)
            COALESCE(ms.criados, 0)::int AS criados,
            COALESCE(ms.entregues, 0)::int AS entregues,
            COALESCE(ms.devolvidos, 0)::int AS devolvidos
        FROM months m
        LEFT JOIN monthly_stats ms ON m.month_start = ms.month
        ORDER BY m.month_start
    ) t;

    RETURN COALESCE(report_data, '[]'::json);
END;
$$;
