-- Arquivo: supabase/migrations/054_create_task_management_functions.sql
-- Descrição: Adiciona as funções RPC para a gestão (CRUD) das tarefas.

-- Etapa 1: Criar a função para criar ou atualizar uma tarefa.
CREATE OR REPLACE FUNCTION create_or_update_task(
    p_task_id INT, -- Forneça um ID para atualizar, ou NULL para criar.
    p_title TEXT,
    p_description TEXT,
    p_frequency_type TEXT,
    p_due_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    IF p_task_id IS NOT NULL THEN
        UPDATE public.tasks
        SET
            title = p_title,
            description = p_description,
            frequency_type = p_frequency_type,
            due_date = p_due_date
        WHERE id = p_task_id;
    ELSE
        INSERT INTO public.tasks (title, description, frequency_type, due_date)
        VALUES (p_title, p_description, p_frequency_type, p_due_date);
    END IF;
END;
$$;


-- Etapa 2: Criar a função para apagar uma tarefa.
CREATE OR REPLACE FUNCTION delete_task(p_task_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    -- Apaga primeiro os registros de conclusão para evitar conflitos de chave estrangeira
    DELETE FROM public.task_completions WHERE task_id = p_task_id;
    -- Apaga a tarefa principal
    DELETE FROM public.tasks WHERE id = p_task_id;
END;
$$;
