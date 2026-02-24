
import { createClient } from '@supabase/supabase-js';

const MANUAL_URL = 'https://tonmhmaxwdhinwdkppfd.supabase.co';
const MANUAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbm1obWF4d2RoaW53ZGtwcGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODAzMzQsImV4cCI6MjA4NDE1NjMzNH0.m7HQa-OOIN5-H57JttvdaLnlBGPh1J1y4NBFSjis2ww';

// O Vite injetará os valores do Vercel aqui através do mapeamento no vite.config.ts
const SUPABASE_URL = process.env.SUPABASE_URL || MANUAL_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || MANUAL_KEY;

export const isSupabaseConfigured = !!(
  SUPABASE_URL && 
  SUPABASE_URL.startsWith('http') && 
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY.length > 20
);

if (!isSupabaseConfigured) {
  console.warn("⚠️ [Supabase] Configuração pendente.");
}

export const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null as any;
