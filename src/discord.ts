import { getDiscordToken, saveLogsToSupabase, MessageToSave, getLastMessageId, hasLogsFromTodaySession } from "./supabase.js";
import dotenv from "dotenv";

dotenv.config();

const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || "1409880028958822490";

// Extrair timestamp do conteúdo da mensagem
function extractTimestampFromContent(content: string): string | null {
  const timestampMatch = content.match(/`(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})`/);
  if (!timestampMatch) return null;

  const timestamp = timestampMatch[1];

  // Converter DD/MM/YYYY HH:MM:SS para formato PostgreSQL
  const [datePart, timePart] = timestamp.split(" ");
  const [day, month, year] = datePart.split("/");
  const [hour, minute, second] = timePart.split(":");

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${hour.padStart(2, "0")}:${minute.padStart(
    2,
    "0"
  )}:${second.padStart(2, "0")}`;
}

// Criar headers para requisição ao Discord
function createDiscordHeaders(authToken: string): Headers {
  const headers = new Headers();
  headers.append("accept", "*/*");
  headers.append("accept-language", "en-US,en-CA;q=0.9,en;q=0.8,pt;q=0.7");
  headers.append("authorization", authToken);
  headers.append("priority", "u=1, i");
  headers.append("referer", `https://discord.com/channels/1148014075683545098/${DISCORD_CHANNEL_ID}`);
  headers.append("sec-ch-ua", '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"');
  headers.append("sec-ch-ua-mobile", "?0");
  headers.append("sec-ch-ua-platform", '"Windows"');
  headers.append("sec-fetch-dest", "empty");
  headers.append("sec-fetch-mode", "cors");
  headers.append("sec-fetch-site", "same-origin");
  headers.append(
    "user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
  );
  headers.append("x-debug-options", "bugReporterEnabled");
  headers.append("x-discord-locale", "pt-BR");
  headers.append("x-discord-timezone", "America/Sao_Paulo");
  headers.append(
    "x-super-properties",
    "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZSwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0MS4wLjAuMCBTYWZhcmkvNTM3LjM2Iiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiJodHRwczovL3d3dy5nb29nbGUuY29tLyIsInJlZmVycmluZ19kb21haW4iOiJ3d3cuZ29vZ2xlLmNvbSIsInNlYXJjaF9lbmdpbmUiOiJnb29nbGUiLCJyZWZlcnJlcl9jdXJyZW50IjoiIiwicmVmZXJyaW5nX2RvbWFpbl9jdXJyZW50IjoiIiwicmVsZWFzZV9jaGFubmVsIjoic3RhYmxlIiwiY2xpZW50X2J1aWxkX251bWJlciI6NDU2ODgyLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsLCJjbGllbnRfbGF1bmNoX2lkIjoiNDkyNzIzODItZjE2OC00ZjViLWIyNmMtN2VjM2M3OTc2YTc4IiwibGF1bmNoX3NpZ25hdHVyZSI6ImYxNzM2N2MxLTI3ZTctNDc5Mi05YjcyLThmOTYyODZlMDFiZCIsImNsaWVudF9oZWFydGJlYXRfc2Vzc2lvbl9pZCI6IjlhNTgyYTQzLTc0ZTktNDY4OS1hZmZjLWQ1MTFjMGMxOWJjYiIsImNsaWVudF9hcHBfc3RhdGUiOiJmb2N1c2VkIn0="
  );

  return headers;
}

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
  };
}

// Buscar mensagens do Discord
export async function fetchDiscordMessages(limit: number = 100, after?: string): Promise<DiscordMessage[]> {
  const authToken = await getDiscordToken();

  if (!authToken) {
    throw new Error("Token de autenticação não configurado no Supabase");
  }

  const headers = createDiscordHeaders(authToken);

  let discordApiUrl = `https://discord.com/api/v9/channels/${DISCORD_CHANNEL_ID}/messages?limit=${limit}`;
  if (after) {
    discordApiUrl += `&after=${after}`;
    console.log(`🔄 Buscando mensagens APÓS ID: ${after}`);
  }

  const response = await fetch(discordApiUrl, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do Discord: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Processar mensagens de uma página e retornar dados para salvar
function processMessagesPage(messages: DiscordMessage[]): MessageToSave[] {
  const messagesToSave: MessageToSave[] = [];

  for (const message of messages) {
    if (message.content && message.id) {
      // Verificar se há múltiplas mensagens separadas por \r\n
      const contentLines = message.content.split(/\r?\n/).filter((line: string) => line.trim().length > 0);

      if (contentLines.length > 1) {
        console.log(`⚠️ Mensagem composta detectada com ${contentLines.length} linhas (ID: ${message.id})`);

        contentLines.forEach((line: string, index: number) => {
          const pgTimestamp = extractTimestampFromContent(line);
          if (pgTimestamp) {
            messagesToSave.push({
              content: line,
              timestamp: pgTimestamp,
              id_message: `${message.id}_${index}`
            });
          }
        });
      } else {
        const pgTimestamp = extractTimestampFromContent(message.content);
        if (pgTimestamp) {
          messagesToSave.push({
            content: message.content,
            timestamp: pgTimestamp,
            id_message: message.id
          });
        }
      }
    }
  }

  return messagesToSave;
}

// Processar mensagens e salvar no banco - COM PAGINAÇÃO COMPLETA
export async function processAndSaveMessages(): Promise<{ total: number; saved: number }> {
  try {
    console.log("🔍 Buscando mensagens do Discord...");

    // Verificar se já temos logs da sessão de hoje
    const hasTodayLogs = await hasLogsFromTodaySession();
    let afterId: string | undefined;

    if (hasTodayLogs) {
      // Já temos logs de hoje, buscar apenas as novas
      const lastMessageId = await getLastMessageId();
      if (lastMessageId) {
        afterId = lastMessageId.split("_")[0];
        console.log(`📌 Continuando sessão de hoje. Última msg: ${afterId}`);
      }
    } else {
      // Primeira execução do dia! Buscar apenas as 100 mais recentes
      console.log(`🆕 Primeira execução da sessão! Buscando apenas as 100 mais recentes...`);
      afterId = undefined; // Sem 'after' = busca as mais recentes
    }

    let allMessages: DiscordMessage[] = [];
    let hasMoreMessages = true;
    let currentAfterId = afterId;
    let pageCount = 0;
    
    // Na primeira execução do dia, buscar apenas 1 página (100 msgs mais recentes)
    // Nas próximas, buscar até 10 páginas de novas mensagens
    const MAX_PAGES = hasTodayLogs ? 10 : 1;
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 25000; // 25 segundos max para ter margem

    // PAGINAÇÃO: Buscar mensagens novas com limite de tempo
    while (hasMoreMessages && pageCount < MAX_PAGES) {
      // Verificar se ainda temos tempo
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏱️ Limite de tempo atingido após ${pageCount} páginas. Continuará na próxima execução.`);
        break;
      }

      pageCount++;
      console.log(`📄 Buscando página ${pageCount}...`);

      const messages = await fetchDiscordMessages(100, currentAfterId);

      if (!messages || messages.length === 0) {
        hasMoreMessages = false;
        break;
      }

      console.log(`   ➡️ Recebidas ${messages.length} mensagens na página ${pageCount}`);
      allMessages = allMessages.concat(messages);

      // Se recebemos menos de 100, não há mais mensagens
      if (messages.length < 100) {
        hasMoreMessages = false;
      } else {
        // Próxima página: usar o ID da última mensagem recebida
        const lastMsg = messages[messages.length - 1];
        currentAfterId = lastMsg.id;
        console.log(`   🔄 Próxima página após ID: ${currentAfterId}`);
      }

      // Pausa reduzida para ser mais rápido
      if (hasMoreMessages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (allMessages.length === 0) {
      console.log("📭 Nenhuma mensagem nova encontrada");
      return { total: 0, saved: 0 };
    }

    console.log(`📨 Total de ${allMessages.length} mensagens recebidas da API (${pageCount} páginas)`);

    // Processar todas as mensagens
    const messagesToSave = processMessagesPage(allMessages);

    console.log(`📝 ${messagesToSave.length} registros prontos para salvar`);

    let savedCount = 0;
    if (messagesToSave.length > 0) {
      // Salvar em lotes de 500 para evitar problemas com payloads grandes
      const BATCH_SIZE = 500;
      for (let i = 0; i < messagesToSave.length; i += BATCH_SIZE) {
        const batch = messagesToSave.slice(i, i + BATCH_SIZE);
        const batchSaved = await saveLogsToSupabase(batch);
        savedCount += batchSaved;
        console.log(`   💾 Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchSaved} registros salvos`);
      }
    }

    console.log(`📊 Resultado Final: ${allMessages.length} mensagens da API | ${savedCount} registros salvos no banco`);

    return { total: allMessages.length, saved: savedCount };
  } catch (error) {
    console.error("❌ Erro ao processar mensagens:", error);
    throw error;
  }
}
