-- Arquivo: supabase/migrations/060_create_notifications_system.sql
-- Descrição: Cria a função para buscar todas as notificações relevantes para o gestor.

CREATE OR REPLACE FUNCTION get_notifications()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    notifications_json JSON;
BEGIN
    -- Apenas administradores podem ver as notificações
    IF (SELECT get_my_role()) <> 'admin' THEN
        RETURN '[]'::json;
    END IF;

    SELECT json_agg(n) INTO notifications_json FROM (
        -- Notificação: Materiais com estoque baixo
        SELECT
            'stock' AS type,
            'Estoque baixo: ' || name AS message,
            '/supplies' AS link,
            id::text AS unique_id
        FROM public.office_supplies
        WHERE stock <= 5

        UNION ALL

        -- Notificação: Tarefas pendentes
        SELECT
            'task' AS type,
            'Tarefa pendente: ' || title AS message,
            '/tasks' AS link,
            id::text AS unique_id
        FROM get_pending_tasks()

        UNION ALL

        -- Notificação: Objetos vencendo em 3 dias
        SELECT
            'object' AS type,
            'Objeto para ' || recipient_name || ' vence em ' || to_char(storage_deadline, 'DD/MM') AS message,
            '/objects' AS link,
            control_number::text AS unique_id
        FROM public.objects
        WHERE status = 'Aguardando Retirada' AND is_archived = FALSE AND storage_deadline BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days')
    ) n;

    RETURN COALESCE(notifications_json, '[]'::json);
END;
$$;
