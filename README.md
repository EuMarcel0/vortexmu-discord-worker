# VortexMU Discord Worker

Worker para captura automática de logs do Discord e armazenamento no Supabase.

## 📋 Funcionalidades

- ✅ Busca mensagens do Discord automaticamente
- ✅ Salva logs no Supabase (ignora duplicados)
- ✅ Agendamento configurável (padrão: 20h às 23h59)
- ✅ Pronto para deploy em múltiplas plataformas

## 🚀 Opções de Deploy Gratuito

### Opção 1: Render.com (Recomendado)
- **Gratuito**: Sim, com limitações
- **Como funciona**: Background Worker que fica rodando
- **Vantagem**: Simples de configurar

### Opção 2: Railway.app
- **Gratuito**: $5 de crédito/mês (suficiente para este uso)
- **Como funciona**: Container que fica rodando
- **Vantagem**: Deploy via GitHub

### Opção 3: Vercel/Netlify (Cron Jobs)
- **Gratuito**: Sim
- **Como funciona**: Execução via cron (a cada X minutos)
- **Limitação**: Máximo 10s de execução (Vercel) / 10min (Netlify)

### Opção 4: GitHub Actions (Gratuito)
- **Gratuito**: 2000 min/mês
- **Como funciona**: Workflow que executa de hora em hora
- **Vantagem**: Zero configuração de servidor

---

## 📦 Instalação Local

```bash
# Clonar/Entrar no projeto
cd vortexmu-discord-worker

# Instalar dependências
npm install

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Rodar em produção
npm start
```

## ⚙️ Configuração (.env)

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui

# Discord Channel ID
DISCORD_CHANNEL_ID=1409880028958822490

# Timezone
TZ=America/Sao_Paulo

# Intervalo de polling em ms (padrão: 5000)
POLLING_INTERVAL=5000

# Horário de funcionamento
START_HOUR=20
END_HOUR=23
END_MINUTE=59
```

---

## 🌐 Deploy no Render.com

1. Crie uma conta em [render.com](https://render.com)
2. Clique em **New** > **Background Worker**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: vortexmu-discord-worker
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Adicione as variáveis de ambiente
6. Clique em **Create Background Worker**

---

## 🚂 Deploy no Railway.app

1. Crie uma conta em [railway.app](https://railway.app)
2. Clique em **New Project** > **Deploy from GitHub repo**
3. Selecione o repositório
4. Vá em **Variables** e adicione as variáveis de ambiente
5. O deploy é automático!

---

## ⚡ Deploy na Vercel (Cron Job)

Use o arquivo `api/cron.ts` para executar via Cron Job.

1. Crie uma conta na [Vercel](https://vercel.com)
2. Importe o repositório
3. Configure as variáveis de ambiente
4. O cron será executado automaticamente

**Limitação**: Máximo 10s por execução no plano gratuito.

---

## 🐙 Deploy via GitHub Actions

Esta é a opção **100% gratuita** e mais simples!

1. Faça push do código para um repositório GitHub
2. Vá em **Settings** > **Secrets and Variables** > **Actions**
3. Adicione os secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. O workflow `.github/workflows/discord-worker.yml` executará automaticamente

---

## 📁 Estrutura do Projeto

```
vortexmu-discord-worker/
├── src/
│   ├── index.ts          # Entrada principal
│   ├── discord.ts        # Integração com Discord
│   ├── supabase.ts       # Integração com Supabase
│   └── scheduler.ts      # Agendamento e polling
├── api/
│   └── cron.ts           # Endpoint para Vercel Cron
├── .github/
│   └── workflows/
│       └── discord-worker.yml  # GitHub Actions
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## 🔒 Segurança

- O token do Discord é armazenado no Supabase (tabela `discord_auth_token`)
- Nunca exponha suas chaves em código público
- Use sempre variáveis de ambiente

## 📝 Logs

O worker exibe logs detalhados:
```
🚀 Iniciando polling (intervalo: 5000ms)
⏰ Horário de funcionamento: 20:00 - 23:59
📨 100 mensagens recebidas da API
✅ 5 nova(s) mensagem(ns) salva(s)
```

## 🛠️ Troubleshooting

### "Token de autenticação não configurado"
- Verifique se há um token na tabela `discord_auth_token` do Supabase

### "Erro 401 na API do Discord"
- O token do Discord expirou
- Atualize o token através da aplicação web ou diretamente no Supabase

### Cron não executa na Vercel
- Verifique se o `vercel.json` está configurado corretamente
- Crons só funcionam em projetos deployados (não em localhost)
