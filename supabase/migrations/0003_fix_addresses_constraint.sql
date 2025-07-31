-- supabase/migrations/0003_fix_addresses_constraint.sql
-- DESCRIÇÃO: Adiciona a restrição de unicidade necessária na tabela de endereços
-- para que a cláusula ON CONFLICT funcione corretamente.

DO $$
BEGIN
    -- Verifica se a restrição já não existe com o nome padrão
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'addresses_street_name_city_id_cep_key'
        AND conrelid = 'public.addresses'::regclass
    ) THEN
        -- Adiciona a restrição de unicidade
        ALTER TABLE public.addresses
        ADD CONSTRAINT addresses_street_name_city_id_cep_key UNIQUE (street_name, city_id, cep);
    END IF;
END;
$$;
