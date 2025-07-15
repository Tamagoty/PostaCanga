-- Arquivo: supabase/migrations/018_create_employee_profile_on_signup.sql
-- Descrição: Cria um gatilho (trigger) para inserir automaticamente um perfil de funcionário
--            na tabela 'public.employees' sempre que um novo usuário for criado na 'auth.users'.

-- 1. Cria a função que será executada pelo gatilho.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com os privilégios do criador da função.
AS $$
BEGIN
  -- Insere um novo registro na tabela 'employees' com os dados do novo usuário.
  -- O nome completo e a matrícula serão preenchidos posteriormente pelo administrador.
  INSERT INTO public.employees (id, full_name, registration_number, role)
  VALUES (new.id, 'Novo Usuário', new.id::text, 'employee');
  RETURN new;
END;
$$;

-- 2. Cria o gatilho que chama a função 'handle_new_user'
--    depois que um novo registro é inserido na tabela 'auth.users'.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

