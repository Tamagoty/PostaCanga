-- Arquivo: supabase/migrations/051_create_object_types_system.sql
-- Descrição: Cria o sistema para gerenciar tipos de objetos customizáveis.

-- Etapa 1: Criar a tabela para armazenar os tipos de objeto.
CREATE TABLE public.object_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    default_storage_days INT NOT NULL DEFAULT 20
);

COMMENT ON TABLE public.object_types IS 'Armazena os tipos de objetos que podem ser cadastrados.';

-- Etapa 2: Popular a tabela com os tipos que já utilizamos na aplicação.
INSERT INTO public.object_types (name, default_storage_days) VALUES
('Encomenda PAC', 7),
('SEDEX', 7),
('Carta Registrada', 20),
('Carta Simples', 20),
('Revista', 20),
('Cartão', 20),
('Telegrama', 7),
('Cartão Registrado', 20),
('Registrado', 7),
('Outro', 7)
ON CONFLICT (name) DO NOTHING;

-- Etapa 3: Criar funções para gerir os tipos de objeto.
CREATE OR REPLACE FUNCTION create_or_update_object_type(p_type_id INT, p_name TEXT, p_default_storage_days INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    IF p_type_id IS NOT NULL THEN
        UPDATE public.object_types SET name=p_name, default_storage_days=p_default_storage_days WHERE id = p_type_id;
    ELSE
        INSERT INTO public.object_types (name, default_storage_days) VALUES (p_name, p_default_storage_days);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION delete_object_type(p_type_id INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (SELECT get_my_role()) <> 'admin' THEN RAISE EXCEPTION 'Apenas administradores podem executar esta ação.'; END IF;
    DELETE FROM public.object_types WHERE id = p_type_id;
END;
$$;

-- Etapa 4: Habilitar RLS e criar políticas de segurança.
ALTER TABLE public.object_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON public.object_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage object types" ON public.object_types FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
