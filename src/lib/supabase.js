// Arquivo: src/lib/supabase.js
// Descrição: Inicializa e exporta o cliente Supabase para ser usado em toda a aplicação.

import { createClient } from '@supabase/supabase-js';

// Lê as variáveis de ambiente do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para garantir que as variáveis de ambiente foram inseridas.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required. Please check your .env file.");
}

// Cria o cliente Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
