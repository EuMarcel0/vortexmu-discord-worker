import cron from "node-cron";
import { processAndSaveMessages } from "./discord.js";
import dotenv from "dotenv";

dotenv.config();

const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL || "5000");
const START_HOUR = parseInt(process.env.START_HOUR || "20");
const END_HOUR = parseInt(process.env.END_HOUR || "23");
const END_MINUTE = parseInt(process.env.END_MINUTE || "59");

let pollingInterval: NodeJS.Timeout | null = null;
let isRunning = false;
let stats = {
  totalMessages: 0,
  savedMessages: 0,
  lastUpdate: null as Date | null,
  errors: 0
};

// Verificar se está dentro do horário permitido
function isWithinSchedule(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Verificar se está entre START_HOUR:00 e END_HOUR:END_MINUTE
  if (currentHour < START_HOUR) return false;
  if (currentHour > END_HOUR) return false;
  if (currentHour === END_HOUR && currentMinute > END_MINUTE) return false;

  return true;
}

// Função de polling
async function pollDiscord(): Promise<void> {
  if (!isWithinSchedule()) {
    console.log(`⏰ Fora do horário de monitoramento (${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE})`);
    stopPolling();
    return;
  }

  try {
    const result = await processAndSaveMessages();
    
    stats.totalMessages += result.total;
    stats.savedMessages += result.saved;
    stats.lastUpdate = new Date();

    if (result.saved > 0) {
      console.log(`✅ ${result.saved} nova(s) mensagem(ns) salva(s)`);
    }
  } catch (error) {
    stats.errors++;
    console.error("❌ Erro no polling:", error);

    // Se for erro de token, parar o polling
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("401") || errorMessage.includes("Token")) {
      console.error("🔑 Token expirado ou inválido! Parando polling...");
      stopPolling();
    }
  }
}

// Iniciar polling
function startPolling(): void {
  if (isRunning) {
    console.log("⚠️ Polling já está em execução");
    return;
  }

  if (!isWithinSchedule()) {
    console.log(`⏰ Fora do horário de monitoramento (${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE})`);
    return;
  }

  console.log(`🚀 Iniciando polling (intervalo: ${POLLING_INTERVAL}ms)`);
  console.log(`⏰ Horário de funcionamento: ${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE}`);
  
  isRunning = true;
  stats = { totalMessages: 0, savedMessages: 0, lastUpdate: null, errors: 0 };

  // Executar imediatamente
  pollDiscord();

  // Configurar intervalo
  pollingInterval = setInterval(pollDiscord, POLLING_INTERVAL);
}

// Parar polling
function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  isRunning = false;
  
  console.log("🛑 Polling parado");
  console.log(`📊 Estatísticas finais:`);
  console.log(`   - Total de mensagens processadas: ${stats.totalMessages}`);
  console.log(`   - Mensagens salvas: ${stats.savedMessages}`);
  console.log(`   - Erros: ${stats.errors}`);
  console.log(`   - Última atualização: ${stats.lastUpdate?.toLocaleString("pt-BR") || "N/A"}`);
}

// Agendar início e fim do monitoramento
function scheduleMonitoring(): void {
  console.log("📅 Configurando agendamento do monitoramento...");
  console.log(`   - Início: ${START_HOUR}:00`);
  console.log(`   - Fim: ${END_HOUR}:${END_MINUTE}`);

  // Agendar início às START_HOUR:00
  cron.schedule(`0 ${START_HOUR} * * *`, () => {
    console.log(`\n⏰ [${new Date().toLocaleString("pt-BR")}] Hora de iniciar o monitoramento!`);
    startPolling();
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Agendar fim às END_HOUR:END_MINUTE
  cron.schedule(`${END_MINUTE} ${END_HOUR} * * *`, () => {
    console.log(`\n⏰ [${new Date().toLocaleString("pt-BR")}] Hora de parar o monitoramento!`);
    stopPolling();
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Verificar se já está dentro do horário ao iniciar
  if (isWithinSchedule()) {
    console.log("✅ Dentro do horário de monitoramento. Iniciando agora...");
    startPolling();
  } else {
    const now = new Date();
    console.log(`⏳ Aguardando horário de início (atual: ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")})`);
  }
}

// Tratamento de sinais para encerramento gracioso
process.on("SIGINT", () => {
  console.log("\n🛑 Recebido SIGINT. Encerrando...");
  stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Recebido SIGTERM. Encerrando...");
  stopPolling();
  process.exit(0);
});

// Exportar funções para uso externo
export { startPolling, stopPolling, isWithinSchedule, scheduleMonitoring, stats };
