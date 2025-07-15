-- Arquivo: supabase/migrations/004_update_object_status_functions.sql
-- Descrição: Funções RPC para alterar o status de um objeto para 'Entregue' ou 'Devolvido'.

-- Função para marcar um objeto como 'Entregue'
CREATE OR REPLACE FUNCTION deliver_object(p_control_number INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Apenas altera o status se o objeto estiver 'Aguardando Retirada'
    UPDATE public.objects
    SET
        status = 'Entregue',
        updated_at = NOW()
    WHERE control_number = p_control_number AND status = 'Aguardando Retirada';
END;
$$;

-- Função para marcar um objeto como 'Devolvido'
CREATE OR REPLACE FUNCTION return_object(p_control_number INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Apenas altera o status se o objeto estiver 'Aguardando Retirada'
    UPDATE public.objects
    SET
        status = 'Devolvido',
        updated_at = NOW()
    WHERE control_number = p_control_number AND status = 'Aguardando Retirada';
END;
$$;
