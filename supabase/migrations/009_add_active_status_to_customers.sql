-- Arquivo: supabase/migrations/009_add_active_status_to_customers.sql
-- Descrição: Adiciona a coluna 'is_active' para controlar o status do cliente.

ALTER TABLE public.customers
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.customers.is_active IS 'Indica se o cliente está ativo no sistema. Se inativo, não pode ser selecionado como contato.';
