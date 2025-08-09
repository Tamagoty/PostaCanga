-- path: supabase/migrations/Manutencao_Unica_Final.sql
-- =============================================================================
-- || SCRIPTS DE MANUTENÇÃO - EXECUÇÃO ÚNICA                                  ||
-- =============================================================================
-- ATENÇÃO: Execute este arquivo APENAS UMA VEZ no seu banco de dados.
--          É altamente recomendado fazer um BACKUP antes de prosseguir.
--
-- OBJETIVO: 1. Unificar endereços duplicados.
--           2. Padronizar todos os CEPs para conter apenas números.
--           3. Corrigir quebras de linha nos modelos de mensagem.
--------------------------------------------------------------------------------

-- PASSO 1: Unificar Endereços Duplicados
BEGIN;
WITH Duplicates AS (
  SELECT
    street_name, city_id, regexp_replace(cep, '\D', '', 'g') as cleaned_cep,
    MIN(id::text)::uuid as master_id, array_agg(id) as all_ids
  FROM public.addresses
  GROUP BY street_name, city_id, cleaned_cep
  HAVING COUNT(*) > 1
),
UpdatedCustomers AS (
  UPDATE public.customers c SET address_id = d.master_id
  FROM Duplicates d
  WHERE c.address_id = ANY(d.all_ids) AND c.address_id <> d.master_id
  RETURNING c.id
)
DELETE FROM public.addresses a
USING Duplicates d
WHERE a.id = ANY(d.all_ids) AND a.id <> d.master_id;
COMMIT;

-- PASSO 2: Limpar e Padronizar CEPs Remanescentes
UPDATE public.addresses
SET cep = regexp_replace(cep, '\D', '', 'g')
WHERE cep IS NOT NULL AND cep ~ '\D';

-- PASSO 3: Corrigir Quebras de Linha nos Modelos de Mensagem
UPDATE public.message_templates
SET content = replace(content, '\n', E'\n')
WHERE content LIKE '%\n%';
