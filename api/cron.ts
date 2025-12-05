import { processAndSaveMessages } from "../src/discord.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Chave secreta para proteger o endpoint (opcional - configure no Vercel)
const CRON_SECRET = process.env.CRON_SECRET;

// Configurações de horário
const START_HOUR = parseInt(process.env.START_HOUR || "20");
const END_HOUR = parseInt(process.env.END_HOUR || "23");
const END_MINUTE = parseInt(process.env.END_MINUTE || "59");

function isWithinSchedule(): boolean {
  const now = new Date();
  // Ajustar para timezone de São Paulo
  const offset = -3; // UTC-3
  const localHour = (now.getUTCHours() + offset + 24) % 24;
  const localMinute = now.getUTCMinutes();

  if (localHour < START_HOUR) return false;
  if (localHour > END_HOUR) return false;
  if (localHour === END_HOUR && localMinute > END_MINUTE) return false;

  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`⏰ Cron executado em: ${new Date().toISOString()}`);

  // Verificar autorização (Vercel Cron envia header específico)
  const authHeader = req.headers.authorization;
  const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isManualWithSecret = req.query.secret === CRON_SECRET;

  // Se CRON_SECRET está configurado, validar acesso
  if (CRON_SECRET && !isVercelCron && !isManualWithSecret) {
    console.log("⛔ Acesso não autorizado ao cron");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Verificar se está dentro do horário
  if (!isWithinSchedule()) {
    console.log(`⏰ Fora do horário de monitoramento (${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE})`);
    return res.status(200).json({
      success: true,
      message: "Fora do horário de monitoramento",
      schedule: `${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE}`
    });
  }

  try {
    const result = await processAndSaveMessages();

    console.log(`✅ Processamento concluído: ${result.saved} mensagens salvas`);

    return res.status(200).json({
      success: true,
      total: result.total,
      saved: result.saved,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Erro no cron:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
}

// Config para Vercel
export const config = {
  maxDuration: 60 // aumentado para suportar paginação completa
};
