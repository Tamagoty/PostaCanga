-- Arquivo: supabase/migrations/004_triggers.sql
-- Descrição: Script consolidado para todos os gatilhos da aplicação.

-- Função para o gatilho de criação de usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.employees (id, full_name, registration_number, role)
  VALUES (new.id, 'Novo Usuário', new.id::text, 'employee');
  RETURN new;
END;
$$;

-- Gatilho que chama a função após um novo usuário ser criado na auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
