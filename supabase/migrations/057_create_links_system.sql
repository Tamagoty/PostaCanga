-- Arquivo: supabase/migrations/057_create_links_system.sql
-- Descrição: Cria a tabela e as funções para o gerenciamento de links de sistemas.

-- Etapa 1: Criar a tabela para armazenar os links.
CREATE TABLE public.system_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    details TEXT, -- Campo para informações adicionais como logins, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.system_links IS 'Armazena links úteis para sistemas externos.';

-- Etapa 2: Habilitar RLS e criar políticas de segurança.
ALTER TABLE public.system_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage links" ON public.system_links
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Etapa 3: Criar funções RPC para gerenciar os links.
CREATE OR REPLACE FUNCTION create_or_update_link(
    p_link_id UUID,
    p_name TEXT,
    p_url TEXT,
    p_description TEXT,
    p_details TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_link_id IS NOT NULL THEN
        -- Atualiza um link existente
        UPDATE public.system_links
        SET
            name = p_name,
            url = p_url,
            description = p_description,
            details = p_details,
            updated_at = NOW()
        WHERE id = p_link_id;
    ELSE
        -- Cria um novo link
        INSERT INTO public.system_links (name, url, description, details)
        VALUES (p_name, p_url, p_description, p_details);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_link(p_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.system_links WHERE id = p_link_id;
END;
$$;
