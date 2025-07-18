-- Arquivo: supabase/migrations/053_create_tasks_management_system.sql
-- Descrição: Cria o sistema de gestão de tarefas recorrentes para o gestor.

-- Etapa 1: Criar a tabela para armazenar a definição das tarefas.
CREATE TABLE public.tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    frequency_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'once'
    due_date DATE, -- Usado para tarefas do tipo 'once'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.tasks IS 'Define as tarefas recorrentes ou únicas do gestor.';

-- Etapa 2: Criar a tabela para registrar a conclusão das tarefas.
CREATE TABLE public.task_completions (
    id BIGSERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.task_completions IS 'Registra quando uma tarefa foi concluída e por quem.';

-- Etapa 3: Popular com algumas tarefas de exemplo.
INSERT INTO public.tasks (title, description, frequency_type) VALUES
('Verificar Caixa de E-mails', 'Responder e organizar os e-mails da agência.', 'daily'),
('Conferir Estoque Mínimo', 'Verificar se algum material de expediente precisa de ser reabastecido.', 'weekly'),
('Relatório Mensal de Objetos', 'Analisar o fluxo de objetos do último mês.', 'monthly'),
('Backup do Sistema', 'Realizar o backup dos dados importantes.', 'monthly')
ON CONFLICT DO NOTHING;

-- Etapa 4: Criar a função inteligente para buscar as tarefas pendentes.
CREATE OR REPLACE FUNCTION get_pending_tasks()
RETURNS TABLE (
    id INT,
    title TEXT,
    description TEXT,
    frequency_type TEXT,
    due_date DATE,
    last_completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        t.description,
        t.frequency_type,
        t.due_date,
        (SELECT MAX(tc.completed_at) FROM task_completions tc WHERE tc.task_id = t.id) AS last_completed_at
    FROM
        public.tasks t
    WHERE
        t.is_active = TRUE
    AND (
        -- Lógica para tarefas diárias (de segunda a sexta)
        (t.frequency_type = 'daily' AND EXTRACT(ISODOW FROM CURRENT_DATE) BETWEEN 1 AND 5 AND NOT EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id AND tc.completed_at::date = CURRENT_DATE)) OR
        -- Lógica para tarefas semanais
        (t.frequency_type = 'weekly' AND (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) < NOW() - INTERVAL '7 days') OR
        -- Lógica para tarefas mensais
        (t.frequency_type = 'monthly' AND (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id) IS NULL OR EXTRACT(MONTH FROM (SELECT MAX(completed_at) FROM task_completions WHERE task_id = t.id)) <> EXTRACT(MONTH FROM CURRENT_DATE)) OR
        -- Adicione outras lógicas de frequência (trimestral, etc.) aqui se necessário
        -- Lógica para tarefas únicas
        (t.frequency_type = 'once' AND t.due_date >= CURRENT_DATE AND NOT EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id))
    )
    ORDER BY t.frequency_type, t.title;
END;
$$;

-- Etapa 5: Criar a função para marcar uma tarefa como concluída.
CREATE OR REPLACE FUNCTION complete_task(p_task_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.task_completions (task_id, user_id)
    VALUES (p_task_id, auth.uid());
END;
$$;
