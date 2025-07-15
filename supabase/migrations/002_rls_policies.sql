-- Arquivo: supabase/migrations/002_rls_policies.sql
-- Descrição: Define as políticas de segurança a nível de linha (Row Level Security) para as tabelas.

-- HABILITAR RLS EM TODAS AS TABELAS
-- É uma boa prática habilitar RLS em todas as tabelas e depois permitir o acesso explicitamente.
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO
-- Por enquanto, vamos criar políticas genéricas que permitem que qualquer funcionário autenticado
-- acesse e modifique os dados. No futuro, podemos refinar isso (ex: gerentes vs. atendentes).

-- Política para a tabela 'addresses'
CREATE POLICY "Employees can manage addresses"
ON public.addresses FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para a tabela 'customers'
CREATE POLICY "Employees can manage customers"
ON public.customers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para a tabela 'employees'
-- Funcionários podem ver todos os outros funcionários, mas só podem alterar seus próprios dados.
CREATE POLICY "Employees can view all employee data"
ON public.employees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employees can update their own data"
ON public.employees FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Política para a tabela 'objects'
CREATE POLICY "Employees can manage objects"
ON public.objects FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para a tabela 'office_supplies'
CREATE POLICY "Employees can manage office supplies"
ON public.office_supplies FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para a tabela 'user_themes'
-- Usuários podem ver, criar, alterar e deletar apenas os seus próprios temas.
CREATE POLICY "Users can manage their own themes"
ON public.user_themes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
