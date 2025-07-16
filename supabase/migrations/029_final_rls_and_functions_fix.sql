-- Arquivo: supabase/migrations/029_final_rls_and_functions_fix.sql
-- Descrição: Correção definitiva para as políticas de segurança (RLS) da tabela 'employees'
--            e para as funções que dependem dela, resolvendo o erro de recursão.

-- Etapa 1: Criar uma função auxiliar segura para verificar a permissão de administrador.
-- CORREÇÃO: Removida a diretiva 'LEAKPROOF' que requer privilégios de superusuário.
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$;


-- Etapa 2: Apagar as políticas de segurança antigas e problemáticas da tabela 'employees'.
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;


-- Etapa 3: Criar as novas políticas de segurança que usam a função 'is_admin'.
-- Esta abordagem quebra o loop de recursão.

-- Política para que todos os funcionários possam ver os seus próprios dados.
CREATE POLICY "Employees can view their own data"
ON public.employees FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política para que administradores possam ver os dados de todos os funcionários.
CREATE POLICY "Admins can view all employees"
ON public.employees FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Política para que administradores possam gerir (criar, atualizar, apagar) funcionários.
CREATE POLICY "Admins can manage employees"
ON public.employees FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));


-- Etapa 4: Recriar a função para listar os funcionários, agora que as RLS estão corrigidas.
-- Esta função agora pode ser mais simples e segura.
DROP FUNCTION IF EXISTS get_all_employee_details(); -- Apaga a versão antiga, se existir.
CREATE OR REPLACE FUNCTION get_all_employee_details()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    registration_number TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
-- Usamos SECURITY INVOKER, que é mais seguro, pois as RLS agora funcionam corretamente.
SECURITY INVOKER
AS $$
BEGIN
    -- A verificação de permissão aqui é uma camada extra de segurança.
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta ação.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email,
        e.full_name,
        e.registration_number,
        e.role,
        e.created_at
    FROM
        auth.users u
    JOIN
        public.employees e ON u.id = e.id
    ORDER BY
        e.full_name;
END;
$$;
