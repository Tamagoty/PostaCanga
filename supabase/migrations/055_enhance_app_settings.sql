-- Arquivo: supabase/migrations/055_enhance_app_settings.sql
-- Descrição: Reestrutura a tabela de configurações e adiciona funções de gestão.

-- Etapa 1: Adicionar a coluna de descrição e tornar a chave mais robusta.
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS description TEXT;

-- Etapa 2: Inserir as novas configurações da agência com valores padrão.
INSERT INTO public.app_settings (key, value, description) VALUES
('agency_dh', '', 'Número da DH (Diretoria de Hubs)'),
('agency_mcu', '', 'MCU (Unidade de Correios) da Agência'),
('agency_sto', '', 'STO (Setor de Triagem e Operações)'),
('agency_address', '', 'Endereço completo da agência')
ON CONFLICT (key) DO NOTHING;

-- Etapa 3: Apagar a função antiga para evitar conflitos.
DROP FUNCTION IF EXISTS update_app_setting(text, text);

-- Etapa 4: Criar a nova função de criar/atualizar, agora com descrição.
CREATE OR REPLACE FUNCTION create_or_update_app_setting(
    p_key TEXT,
    p_value TEXT,
    p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    INSERT INTO public.app_settings (key, value, description)
    VALUES (p_key, p_value, p_description)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, description = EXCLUDED.description;
END;
$$;

-- Etapa 5: Criar a função para apagar uma configuração.
CREATE OR REPLACE FUNCTION delete_app_setting(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    -- Previne que configurações essenciais sejam apagadas.
    IF p_key IN ('agency_name', 'agency_dh', 'agency_mcu', 'agency_sto', 'agency_address') THEN
        RAISE EXCEPTION 'Esta configuração não pode ser apagada.';
    END IF;
    DELETE FROM public.app_settings WHERE key = p_key;
END;
$$;

-- Etapa 6: Habilitar RLS e criar políticas de segurança.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;

CREATE POLICY "Allow read access to all authenticated users" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
