-- path: supabase/migrations/0009_Funcao_Baixa_Lote.sql
-- =============================================================================
-- || ARQUIVO 9: FUNÇÃO PARA DAR BAIXA DE OBJETOS EM LOTE                     ||
-- =============================================================================
-- DESCRIÇÃO: Cria a função RPC 'bulk_update_object_status' que permite
-- atualizar o status de múltiplos objetos (para 'Entregue' ou 'Devolvido')
-- de uma só vez, recebendo uma lista de control_numbers.

CREATE OR REPLACE FUNCTION public.bulk_update_object_status(
    p_control_numbers INT[],
    p_new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
    -- Valida se o novo status é um dos permitidos para esta operação
    IF p_new_status NOT IN ('Entregue', 'Devolvido') THEN
        RAISE EXCEPTION 'Status inválido. Apenas "Entregue" ou "Devolvido" são permitidos.';
    END IF;

    UPDATE public.objects
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE
        control_number = ANY(p_control_numbers)
        AND status = 'Aguardando Retirada'; -- Garante que apenas objetos aguardando retirada sejam atualizados
END;
$$;
