# Logistics Control Tower System

Sistema corporativo full-stack para gestão diária de logística e transporte:
- **Torre de Controle de Transferências:** Monitoramento em tempo real com cálculo automático de jornada (Pegada + 11h20 / 08h20) e badges de estouro/alerta.
- **Escala de Distribuição:** Grade completa com filtros por Doca, Horários, Placas, Motoristas e Ajudantes.
- **Visão do Pátio & Impressão:** Exibe todas as lojas da rota (ex: `VOT - SOR`) e layout otimizado para impressão (A4).
- **Importador Inteligente:** Leitura de arquivos `.xlsx` (padrão CDFT) e `.pdf` da preliminar, com separação automática entre Transferência e Distribuição.
- **Central WhatsApp:** Gerador de mensagens formatadas com emojis e negrito prontas para copiar.
- **Colaboração em Tempo Real:** Sincronização instantânea entre múltiplos operadores via WebSockets.

## Como Executar Localmente

### Opção 1: Via Bun (Recomendado - Instantâneo)
```bash
cd /home/roviro/.gemini/antigravity/scratch/logistics-control-tower
bun install
bun run build
bun run server
```
Acesse no seu navegador: **http://localhost:3333**

### Opção 2: Modo Desenvolvimento com Hot Reload
Terminal 1 (Backend API & WebSocket):
```bash
bun run server
```
Terminal 2 (Vite Frontend):
```bash
bun run dev
```
Acesse: **http://localhost:5173**

## Como Rodar via Docker (Servidor VPS / Produção)
```bash
docker compose up -d --build
```
