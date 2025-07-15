-- Arquivo: supabase/seed.sql
-- Descrição: Insere dados iniciais no banco de dados para teste e desenvolvimento.
-- Este arquivo pode ser executado no editor SQL do Supabase para popular as tabelas.

-- Inserir alguns materiais de expediente como exemplo
INSERT INTO public.office_supplies (name, stock, description)
VALUES
    ('Caneta Esferográfica Azul', 100, 'Caixa com 50 unidades, marca BIC.'),
    ('Bloco de Anotações A5', 50, 'Bloco com 100 folhas pautadas.'),
    ('Clipes de Papel 2/0', 20, 'Caixa com 100 clipes galvanizados.'),
    ('Grampeador', 5, 'Grampeador de mesa para até 25 folhas.'),
    ('Caixa de Grampos 26/6', 30, 'Caixa com 5000 grampos.')
ON CONFLICT (name) DO NOTHING; -- Não faz nada se o material já existir

-- Você pode adicionar mais dados aqui no futuro.
-- Exemplo: Criar um cliente e um endereço padrão.
-- OBS: A criação de funcionários está atrelada à autenticação do Supabase,
-- então o ideal é criá-los pela interface do Supabase ou pelo registro no app.

