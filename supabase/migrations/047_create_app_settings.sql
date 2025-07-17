-- Arquivo: supabase/migrations/047_create_app_settings.sql
-- Descrição: Cria a tabela e as funções para gerir as configurações da aplicação.

-- Etapa 1: Criar a tabela para armazenar as configurações como pares chave-valor.
CREATE TABLE public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

COMMENT ON TABLE public.app_settings IS 'Armazena configurações globais da aplicação.';

-- Etapa 2: Inserir a configuração inicial para o nome da agência.
INSERT INTO public.app_settings (key, value)
VALUES ('agency_name', 'Correio de América Dourada')
ON CONFLICT (key) DO NOTHING;

-- Etapa 3: Criar uma função para atualizar uma configuração.
CREATE OR REPLACE FUNCTION update_app_setting(
    p_key TEXT,
    p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;

    INSERT INTO public.app_settings (key, value)
    VALUES (p_key, p_value)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value;
END;
$$;
