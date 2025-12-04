import dotenv from "dotenv";
import { scheduleMonitoring } from "./scheduler.js";
import { getSupabaseClient } from "./supabase.js";

// Carregar variáveis de ambiente
dotenv.config();

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║     VortexMU Discord Worker - Log Collector                ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log("║  Captura automática de logs do Discord para o Supabase     ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");

// Validar configurações
function validateConfig(): boolean {
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Variáveis de ambiente faltando:", missing.join(", "));
    console.error("   Copie .env.example para .env e configure as variáveis");
    return false;
  }

  return true;
}

// Testar conexão com Supabase
async function testConnection(): Promise<boolean> {
  try {
    console.log("🔌 Testando conexão com Supabase...");
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("discord_auth_token")
      .select("id")
      .limit(1);

    if (error) {
      console.error("❌ Erro ao conectar com Supabase:", error.message);
      return false;
    }

    console.log("✅ Conexão com Supabase estabelecida!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao testar conexão:", error);
    return false;
  }
}

// Função principal
async function main(): Promise<void> {
  console.log("🔧 Validando configurações...");
  
  if (!validateConfig()) {
    process.exit(1);
  }

  console.log("✅ Configurações válidas!\n");

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Não foi possível conectar ao Supabase. Verifique as credenciais.");
    process.exit(1);
  }

  console.log("");
  console.log("🚀 Iniciando serviço de monitoramento...\n");
  
  // Iniciar o agendamento
  scheduleMonitoring();

  // Manter o processo rodando
  console.log("\n💡 Pressione Ctrl+C para encerrar\n");
}

// Executar
main().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
