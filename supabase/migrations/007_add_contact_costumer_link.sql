-- Arquivo: supabase/migrations/007_add_contact_customer_link.sql
-- Descrição: Adiciona a capacidade de um cliente ser o contato de outro.

-- Adiciona a coluna para o link de contato, que pode ser nula.
ALTER TABLE public.customers
ADD COLUMN contact_customer_id UUID;

-- Adiciona a chave estrangeira que aponta para a própria tabela 'customers'.
-- Se o cliente de contato for deletado, o campo neste cliente ficará nulo.
ALTER TABLE public.customers
ADD CONSTRAINT fk_contact_customer
FOREIGN KEY (contact_customer_id)
REFERENCES public.customers(id)
ON DELETE SET NULL;

-- Adiciona uma verificação para garantir que um cliente não seja seu próprio contato.
ALTER TABLE public.customers
ADD CONSTRAINT chk_self_contact
CHECK (id <> contact_customer_id);

COMMENT ON COLUMN public.customers.contact_customer_id IS 'ID do cliente que servirá de contato para notificações, caso este não tenha celular.';
