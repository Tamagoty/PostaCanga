-- Arquivo: supabase/migrations/004_rls_policies.sql
-- Descrição: Habilita o RLS e cria todas as políticas de segurança da aplicação.

--------------------------------------------------------------------------------
-- 7. POLÍTICAS DE SEGURANÇA (RLS)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.employees WHERE id = p_user_id AND role = 'admin'); END; $$;

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_stock_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_code_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_links ENABLE ROW LEVEL SECURITY;

-- Apagar políticas antigas para garantir um estado limpo
DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename) || ';'; END LOOP; END $$;

-- Políticas Gerais
CREATE POLICY "Allow read access to all authenticated users" ON public.states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.cities FOR SELECT TO authenticated USING (true);

-- Políticas de Acesso Total para Funcionários
CREATE POLICY "Employees can manage data" ON public.addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.office_supplies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.supply_stock_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.bulk_import_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage data" ON public.system_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas Específicas
CREATE POLICY "Users can manage their own themes" ON public.user_themes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employees can view their own data" ON public.employees FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage object types" ON public.object_types FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Allow read access to object types" ON public.object_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tracking rules" ON public.tracking_code_rules FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Allow read access to tracking rules" ON public.tracking_code_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Allow read access to app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can manage task completions" ON public.task_completions FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
