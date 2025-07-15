-- Arquivo: supabase/migrations/013_create_theme_management_functions.sql
-- Descrição: Funções RPC para salvar e carregar temas de cores personalizados dos usuários.

-- Função para salvar ou atualizar um tema de usuário.
-- Utiliza ON CONFLICT para simplificar a lógica de 'upsert'.
CREATE OR REPLACE FUNCTION save_user_theme(
    p_theme_name TEXT,
    p_theme_colors JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_themes (user_id, theme_name, theme_colors)
    VALUES (auth.uid(), p_theme_name, p_theme_colors)
    ON CONFLICT (user_id, theme_name)
    DO UPDATE SET
        theme_colors = EXCLUDED.theme_colors,
        created_at = NOW();
END;
$$;


-- Função para deletar um tema de usuário.
CREATE OR REPLACE FUNCTION delete_user_theme(
    p_theme_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.user_themes
    WHERE id = p_theme_id AND user_id = auth.uid();
END;
$$;
