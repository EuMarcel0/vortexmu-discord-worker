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
