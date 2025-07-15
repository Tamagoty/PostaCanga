-- Arquivo: supabase/migrations/014_add_role_to_employees.sql
-- Descrição: Adiciona uma coluna de 'role' para diferenciar administradores de funcionários.

-- Adiciona a coluna 'role' com 'employee' como padrão.
ALTER TABLE public.employees
ADD COLUMN role TEXT NOT NULL DEFAULT 'employee';

COMMENT ON COLUMN public.employees.role IS 'Define a permissão do usuário (ex: ''admin'', ''employee'').';

-- Atualiza as políticas de segurança para a tabela 'employees'.
-- Remove as políticas antigas para evitar conflitos.
DROP POLICY IF EXISTS "Employees can view all employee data" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own data" ON public.employees;

-- Nova política: Todos os funcionários autenticados podem ver os seus próprios dados.
CREATE POLICY "Employees can view their own data"
ON public.employees FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Nova política: Apenas administradores podem ver os dados de todos os funcionários.
CREATE POLICY "Admins can view all employees"
ON public.employees FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);

-- Nova política: Apenas administradores podem inserir, atualizar ou deletar funcionários.
CREATE POLICY "Admins can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.employees WHERE id = auth.uid()) = 'admin'
);

-- Para que a primeira conta seja um admin, execute este comando no SQL Editor após criar seu primeiro usuário:
-- UPDATE public.employees SET role = 'admin' WHERE id = 'SEU_USER_ID_AQUI';
