import { createClient } from '@supabase/supabase-client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função padrão para salvar os dados da sua equipe
export async function salvarDadosEquipe(nomeUsuario: string, dadosMensagem: string) {
  try {
    await supabase.from('historico_conversas').insert([
      { usuario: nomeUsuario, mensagem: dadosMensagem }
    ]);
  } catch (error) {
    console.error("Erro ao salvar no banco:", error);
  }
}
