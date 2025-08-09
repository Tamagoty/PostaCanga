-- supabase/migrations/Manutencao_Unica.sql
-- =============================================================================
-- || SCRIPTS DE MANUTENÇÃO - EXECUÇÃO ÚNICA                                  ||
-- =============================================================================
-- ATENÇÃO: Execute este arquivo APENAS UMA VEZ no seu banco de dados.
--          É altamente recomendado fazer um BACKUP antes de prosseguir.
--
-- OBJETIVO: 1. Unificar endereços duplicados que possuem o mesmo CEP (com e sem máscara).
--           2. Padronizar todos os CEPs para conter apenas números.
--------------------------------------------------------------------------------

-- =============================================================================
-- || PASSO 1: Unificar Endereços Duplicados                                  ||
-- =============================================================================
-- DESCRIÇÃO: Identifica endereços duplicados, move os clientes para um único
--            endereço "mestre" e apaga os registros que não são mais necessários.

BEGIN;

WITH Duplicates AS (
  SELECT
    street_name,
    city_id,
    regexp_replace(cep, '\D', '', 'g') as cleaned_cep,
    MIN(id::text)::uuid as master_id,
    array_agg(id) as all_ids
  FROM
    public.addresses
  GROUP BY
    street_name, city_id, cleaned_cep
  HAVING
    COUNT(*) > 1
),
UpdatedCustomers AS (
  UPDATE
    public.customers c
  SET
    address_id = d.master_id
  FROM
    Duplicates d
  WHERE
    c.address_id = ANY(d.all_ids) AND c.address_id <> d.master_id
  RETURNING c.id
)
DELETE FROM
  public.addresses a
USING
  Duplicates d
WHERE
  a.id = ANY(d.all_ids) AND a.id <> d.master_id;

COMMIT;


-- =============================================================================
-- || PASSO 2: Limpar e Padronizar CEPs Remanescentes                         ||
-- =============================================================================
-- DESCRIÇÃO: Remove todos os caracteres não numéricos (pontos, traços, etc.)
--            da coluna 'cep' em todos os endereços restantes.

UPDATE public.addresses
SET cep = regexp_replace(cep, '\D', '', 'g')
WHERE
  cep IS NOT NULL AND cep ~ '\D';
