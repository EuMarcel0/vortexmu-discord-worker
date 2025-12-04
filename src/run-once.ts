/**
 * Script para execução única (usado pelo GitHub Actions)
 * Busca mensagens e salva no banco uma vez, depois encerra
 */

import dotenv from "dotenv";
import { processAndSaveMessages } from "./discord.js";
import { getSupabaseClient, getDiscordToken } from "./supabase.js";

dotenv.config();

async function runOnce(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     VortexMU Discord Worker - Execução Única               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`⏰ Executando em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
  console.log("");

  try {
    // Testar conexão
    console.log("🔌 Testando conexão com Supabase...");
    const supabase = getSupabaseClient();
    
    const { error: testError } = await supabase
      .from("discord_auth_token")
      .select("id")
      .limit(1);

    if (testError) {
      throw new Error(`Erro ao conectar com Supabase: ${testError.message}`);
    }
    console.log("✅ Conexão com Supabase OK!");

    // Verificar token
    console.log("🔑 Verificando token do Discord...");
    const token = await getDiscordToken();
    if (!token) {
      throw new Error("Token do Discord não encontrado no Supabase");
    }
    console.log("✅ Token do Discord encontrado!");
    console.log("");

    // Processar mensagens
    console.log("🔍 Buscando e processando mensagens...");
    const result = await processAndSaveMessages();

    console.log("");
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                      RESULTADO                             ║");
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(`║  Mensagens processadas: ${result.total.toString().padEnd(33)}║`);
    console.log(`║  Mensagens salvas: ${result.saved.toString().padEnd(38)}║`);
    console.log("╚════════════════════════════════════════════════════════════╝");

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("❌ ERRO:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runOnce();
