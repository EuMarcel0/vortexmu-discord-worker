import { processAndSaveMessages } from "../src/discord.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Chave secreta para proteger o endpoint - OBRIGATÓRIO configurar no Vercel
const CRON_SECRET = process.env.CRON_SECRET;

// Configurações de horário (São Paulo UTC-3)
const START_HOUR = parseInt(process.env.START_HOUR || "20");
const END_HOUR = parseInt(process.env.END_HOUR || "23");

function isWithinSchedule(): boolean {
  const now = new Date();
  const offset = -3; // UTC-3 São Paulo
  const localHour = (now.getUTCHours() + offset + 24) % 24;
  const localMinute = now.getUTCMinutes();

  if (localHour < START_HOUR) return false;
  if (localHour > END_HOUR) return false;
  if (localHour === END_HOUR && localMinute > 59) return false;

  return true;
}

/**
 * Endpoint para ser chamado por serviços externos de cron
 * Como: cron-job.org, EasyCron, UptimeRobot, etc.
 * 
 * Configurar no serviço externo:
 * URL: https://seu-projeto.vercel.app/api/trigger?secret=SUA_CHAVE_SECRETA
 * Método: GET
 * Intervalo: A cada 2 minutos
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  console.log(`🚀 Trigger executado em: ${new Date().toISOString()}`);

  // Validar chave secreta (obrigatório)
  if (!CRON_SECRET) {
    console.error("❌ CRON_SECRET não configurado nas variáveis de ambiente");
    return res.status(500).json({ error: "CRON_SECRET not configured" });
  }

  const providedSecret = req.query.secret || req.headers["x-cron-secret"];
  
  if (providedSecret !== CRON_SECRET) {
    console.log("⛔ Acesso não autorizado");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verificar horário (opcional - pode deixar o serviço externo controlar)
  const skipScheduleCheck = req.query.force === "true";
  
  if (!skipScheduleCheck && !isWithinSchedule()) {
    const now = new Date();
    const offset = -3;
    const localHour = (now.getUTCHours() + offset + 24) % 24;
    const localMinute = now.getUTCMinutes();
    
    console.log(`⏰ Fora do horário: ${localHour}:${localMinute.toString().padStart(2, "0")} (permitido: ${START_HOUR}:00 - ${END_HOUR}:59)`);
    return res.status(200).json({
      success: true,
      skipped: true,
      message: `Fora do horário de monitoramento`,
      currentTime: `${localHour}:${localMinute.toString().padStart(2, "0")}`,
      schedule: `${START_HOUR}:00 - ${END_HOUR}:59`
    });
  }

  try {
    const result = await processAndSaveMessages();
    const duration = Date.now() - startTime;

    console.log(`✅ Concluído em ${duration}ms: ${result.saved} novas mensagens`);

    return res.status(200).json({
      success: true,
      total: result.total,
      saved: result.saved,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro:", errorMessage);

    return res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}
