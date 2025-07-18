-- Arquivo: supabase/migrations/056_update_dashboard_function.sql
-- Descrição: Altera a função get_dashboard_data para incluir as tarefas pendentes.

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
    v_upcoming_birthdays JSON;
    v_pending_tasks JSON; -- Nova variável para as tarefas
BEGIN
    SELECT COUNT(*) INTO v_awaiting_objects_count FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE;
    SELECT COUNT(*) INTO v_expiring_soon_count FROM public.objects WHERE status = 'Aguardando Retirada' AND is_archived = FALSE AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days');
    SELECT COUNT(*) INTO v_low_stock_count FROM public.office_supplies WHERE stock <= 5;
    
    SELECT json_agg(t) INTO v_recent_objects FROM (
        SELECT control_number, recipient_name, object_type, arrival_date FROM public.objects 
        ORDER BY arrival_date DESC, created_at DESC LIMIT 5
    ) t;

    SELECT json_agg(b) INTO v_upcoming_birthdays FROM (
        SELECT id, full_name, birth_date FROM public.customers WHERE is_active = TRUE AND birth_date IS NOT NULL
    ) b;

    -- Nova etapa: Buscar as tarefas pendentes usando a função já existente.
    SELECT json_agg(pt.*) INTO v_pending_tasks FROM get_pending_tasks() pt;

    -- Adiciona a nova chave 'pending_tasks' ao objeto de retorno.
    RETURN json_build_object(
        'awaiting_count', v_awaiting_objects_count,
        'expiring_count', v_expiring_soon_count,
        'low_stock_count', v_low_stock_count,
        'recent_objects', COALESCE(v_recent_objects, '[]'::json),
        'upcoming_birthdays', COALESCE(v_upcoming_birthdays, '[]'::json),
        'pending_tasks', COALESCE(v_pending_tasks, '[]'::json)
    );
END;
$$;