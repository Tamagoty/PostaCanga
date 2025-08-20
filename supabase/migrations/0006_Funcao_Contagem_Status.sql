-- path: supabase/migrations/0006_Funcao_Contagem_Status.sql
-- =============================================================================
-- || ARQUIVO 6: FUNÇÃO PARA CONTAGEM DE OBJETOS POR STATUS                   ||
-- =============================================================================
-- DESCRIÇÃO: Cria a função RPC 'get_object_status_counts' que é chamada
-- pelo frontend para exibir a quantidade de objetos em cada filtro.

CREATE OR REPLACE FUNCTION public.get_object_status_counts()
RETURNS TABLE (status TEXT, count BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    -- Contagem para status diretos (não arquivados)
    SELECT
        o.status::TEXT,
        COUNT(o.control_number)::BIGINT
    FROM
        public.objects o
    WHERE
        o.is_archived = FALSE
        AND o.status IN ('Aguardando Retirada', 'Entregue', 'Devolvido')
    GROUP BY
        o.status

    UNION ALL

    -- Contagem especial para 'Vencidos'
    SELECT
        'Vencidos'::TEXT AS status,
        COUNT(o.control_number)::BIGINT
    FROM
        public.objects o
    WHERE
        o.is_archived = FALSE
        AND o.status = 'Aguardando Retirada'
        AND o.storage_deadline < CURRENT_DATE

    UNION ALL

    -- Contagem para 'Arquivados'
    SELECT
        'Arquivados'::TEXT AS status,
        COUNT(o.control_number)::BIGINT
    FROM
        public.objects o
    WHERE
        o.is_archived = TRUE;
END;
$$;
