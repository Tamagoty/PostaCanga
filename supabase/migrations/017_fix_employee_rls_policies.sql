-- Arquivo: supabase/migrations/017_fix_employee_rls_policies.sql
-- Descrição: Corrige as políticas de segurança da tabela 'employees' para evitar recursão infinita.

-- Remove as políticas antigas e problemáticas.
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

-- Nova política: Todos os funcionários autenticados podem ver os seus próprios dados.
-- Esta política não precisa da função auxiliar.
CREATE POLICY "Employees can view their own data"
ON public.employees FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Nova política: Apenas administradores podem ver os dados de todos os funcionários.
-- Agora utiliza a função get_my_role() para evitar o loop.
CREATE POLICY "Admins can view all employees"
ON public.employees FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
);

-- Nova política: Apenas administradores podem inserir, atualizar ou deletar funcionários.
CREATE POLICY "Admins can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (
  get_my_role() = 'admin'
)
WITH CHECK (
  get_my_role() = 'admin'
);
