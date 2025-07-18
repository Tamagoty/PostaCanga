// Arquivo: supabase/functions/_shared/cors.ts
// DESCRIÇÃO: Arquivo compartilhado para lidar com headers de CORS.
// É uma prática padrão para Edge Functions da Supabase permitir
// que o seu frontend (ex: localhost, seu site em produção) chame a função.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
