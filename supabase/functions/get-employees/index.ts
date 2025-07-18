// Arquivo: supabase/functions/get-employees/index.ts
// DESCRIÇÃO: Supabase Edge Function para buscar dados de funcionários de forma segura.
// Esta função é executada no servidor da Supabase, não no navegador do cliente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Trata a requisição OPTIONS (preflight) para CORS.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Cria um cliente Supabase com privilégios de administrador DENTRO da função.
    // As variáveis de ambiente são configuradas de forma segura no painel da Supabase.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // CORREÇÃO: Usando o novo nome do "secret" que não começa com SUPABASE_
      Deno.env.get('ADMIN_SERVICE_ROLE_KEY') ?? ''
    );

    // Etapa 1: Busca os dados de autenticação (e-mails) usando o cliente admin.
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    // Etapa 2: Busca os perfis da tabela 'employees'.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, registration_number, role');
    if (profileError) throw profileError;

    // Etapa 3: Combina os dados, adicionando o e-mail a cada perfil.
    const combinedData = profiles.map(profile => {
      const authUser = users.find(user => user.id === profile.id);
      return {
        ...profile,
        email: authUser ? authUser.email : 'Não encontrado',
      };
    });

    // Retorna os dados combinados com sucesso.
    return new Response(JSON.stringify(combinedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Em caso de erro, retorna uma mensagem de erro genérica.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
