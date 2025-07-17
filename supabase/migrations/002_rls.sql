-- Arquivo: supabase/migrations/002_rls.sql
-- Descrição: Script consolidado para habilitar e configurar todas as políticas de RLS.

-- HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_stock_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
-- As tabelas 'states' e 'cities' são dados públicos, mas é uma boa prática habilitar RLS.
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- FUNÇÕES AUXILIARES DE PERMISSÃO
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.employees WHERE id = p_user_id AND role = 'admin');
END;
$$;

-- POLÍTICAS DE ACESSO

-- states e cities: Qualquer usuário autenticado pode ler.
CREATE POLICY "Allow read access to all authenticated users" ON public.states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to all authenticated users" ON public.cities FOR SELECT TO authenticated USING (true);

-- addresses, customers, objects, office_supplies, supply_stock_log: Acesso total para funcionários.
CREATE POLICY "Employees can manage addresses" ON public.addresses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage objects" ON public.objects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage office supplies" ON public.office_supplies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Employees can manage stock log" ON public.supply_stock_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- employees: Regras específicas para administradores.
CREATE POLICY "Employees can view their own data" ON public.employees FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all employees" ON public.employees FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- user_themes: Usuários só podem gerir os seus próprios temas.
CREATE POLICY "Users can manage their own themes" ON public.user_themes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
