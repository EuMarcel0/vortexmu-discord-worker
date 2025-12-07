import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env");
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseInstance;
}

// Interface para os logs
export interface LogPvP {
  id?: number;
  created_at?: string;
  content: string;
  timestamp: string;
  id_message?: string;
}

// Interface para mensagem a ser salva
export interface MessageToSave {
  content: string;
  timestamp: string;
  id_message: string;
}

// Buscar token do Discord do Supabase
export async function getDiscordToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("discord_auth_token")
      .select("token")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar token do Discord:", error.message);
      return null;
    }

    return data?.token || null;
  } catch (error) {
    console.error("❌ Erro ao buscar token do Discord:", error);
    return null;
  }
}

// Salvar logs em batch no Supabase (ignora duplicados automaticamente)
export async function saveLogsToSupabase(messages: MessageToSave[]): Promise<number> {
  try {
    if (messages.length === 0) return 0;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("logs_pvp")
      .upsert(messages, {
        onConflict: "id_message",
        ignoreDuplicates: true
      })
      .select();

    if (error) {
      console.error("❌ Erro ao salvar logs no Supabase:", error.message);
      return 0;
    }

    return data ? data.length : 0;
  } catch (error) {
    console.error("❌ Erro ao salvar logs no Supabase:", error);
    return 0;
  }
}

// Buscar o ID da última mensagem salva no banco
export async function getLastMessageId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("logs_pvp")
      .select("id_message")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = nenhum registro encontrado, não é erro
      if (error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar último ID:", error.message);
      }
      return null;
    }

    return data?.id_message || null;
  } catch (error) {
    console.error("❌ Erro ao buscar último ID:", error);
    return null;
  }
}

// Verificar se já temos logs salvos do horário de hoje (20h-23h59)
export async function hasLogsFromTodaySession(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Calcular o início da sessão de hoje (20:00 horário de São Paulo)
    const now = new Date();
    const offset = -3; // UTC-3 São Paulo
    const localHour = (now.getUTCHours() + offset + 24) % 24;
    
    // Se estamos entre 20h e 23h59, verificar se há logs de hoje após as 20h
    if (localHour >= 20 && localHour <= 23) {
      // Data de hoje às 20:00 em UTC (23:00 UTC = 20:00 BRT)
      const todayStart = new Date(now);
      todayStart.setUTCHours(23, 0, 0, 0); // 20:00 BRT = 23:00 UTC
      
      // Se já passou da meia-noite UTC mas ainda é antes das 3h UTC (ainda é o mesmo dia em BRT)
      if (now.getUTCHours() < 3) {
        todayStart.setUTCDate(todayStart.getUTCDate() - 1);
      }
      
      const { data, error } = await supabase
        .from("logs_pvp")
        .select("id")
        .gte("created_at", todayStart.toISOString())
        .limit(1);
      
      if (error) {
        console.error("❌ Erro ao verificar logs de hoje:", error.message);
        return false;
      }
      
      return data && data.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error("❌ Erro ao verificar logs de hoje:", error);
    return false;
  }
}
