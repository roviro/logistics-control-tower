import { 
  getEscalaCompleta, 
  getOrCreateEscala, 
  getEscalaPeriodo,
  upsertDistribuicao, 
  deleteDistribuicao, 
  upsertTransferencia, 
  deleteTransferencia, 
  upsertPlantao, 
  deletePlantao,
  upsertPassagemTurno,
  deletePassagemTurno,
  upsertTemperaturaCross,
  deleteTemperaturaCross,
  upsertAjudante,
  deleteAjudante,
  saveImportedData,
  checkDuplicidades,
  saveImportedDataWithMode,
  createDatabaseBackup,
  autenticarUsuario,
  validarSessao,
  encerrarSessao,
  listarUsuarios,
  criarUsuario,
  alterarSenha,
  db
} from './db';
import { UsuarioLogado } from '../types';
import { parseXlsxBuffer, parsePdfBuffer, parseRawText, parseStructuredAiJson } from './parsers';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const PORT = parseInt(process.env.PORT || '3333', 10);
const distDir = path.resolve(process.cwd(), 'dist');

const clients = new Set<any>();

function getAuthUser(req: Request): UsuarioLogado | null {
  const authHeader = req.headers.get('Authorization') || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    try {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || '';
    } catch {}
  }
  if (!token) return null;
  return validarSessao(token);
}

function broadcast(event: string, data: any) {
  const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // 1. Upgrade WebSocket
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade falhou', { status: 400 });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. REST API
    if (url.pathname.startsWith('/api/')) {
      try {
        // --- ROTAS DE AUTENTICAÇÃO E PERFIS ---
        // POST /api/auth/login
        if (url.pathname === '/api/auth/login' && req.method === 'POST') {
          const body = await req.json();
          const result = await autenticarUsuario(body.username, body.password);
          if (!result.success) {
            return Response.json(result, { status: 401, headers: corsHeaders });
          }
          return Response.json(result, { headers: corsHeaders });
        }

        // GET /api/auth/me
        if (url.pathname === '/api/auth/me' && (req.method === 'GET' || req.method === 'HEAD')) {
          const user = getAuthUser(req);
          if (!user) {
            return Response.json({ success: false, error: 'Sessão inválida ou expirada' }, { status: 401, headers: corsHeaders });
          }
          return Response.json({ success: true, user }, { headers: corsHeaders });
        }

        // POST /api/auth/logout
        if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
          const authHeader = req.headers.get('Authorization') || '';
          if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            encerrarSessao(token);
          }
          return Response.json({ success: true }, { headers: corsHeaders });
        }

        // GET /api/users (Exclusivo T.I)
        if (url.pathname === '/api/users' && (req.method === 'GET' || req.method === 'HEAD')) {
          const user = getAuthUser(req);
          if (!user || user.perfil !== 'TI') {
            return Response.json({ success: false, error: 'Acesso restrito ao perfil T.I' }, { status: 403, headers: corsHeaders });
          }
          const users = listarUsuarios();
          return Response.json({ success: true, users }, { headers: corsHeaders });
        }

        // POST /api/users (Exclusivo T.I)
        if (url.pathname === '/api/users' && req.method === 'POST') {
          const user = getAuthUser(req);
          if (!user || user.perfil !== 'TI') {
            return Response.json({ success: false, error: 'Acesso restrito ao perfil T.I' }, { status: 403, headers: corsHeaders });
          }
          const body = await req.json();
          const result = await criarUsuario(body);
          if (!result.success) {
            return Response.json(result, { status: 400, headers: corsHeaders });
          }
          return Response.json(result, { headers: corsHeaders });
        }

        // PUT /api/users/password (T.I para qualquer usuário, ou usuário para si mesmo)
        if (url.pathname === '/api/users/password' && req.method === 'PUT') {
          const user = getAuthUser(req);
          if (!user) {
            return Response.json({ success: false, error: 'Não autenticado' }, { status: 401, headers: corsHeaders });
          }
          const body = await req.json();
          const targetUserId = (user.perfil === 'TI' && body.usuarioId) ? body.usuarioId : user.id;
          const result = await alterarSenha(targetUserId, body.novaSenha);
          if (!result.success) {
            return Response.json(result, { status: 400, headers: corsHeaders });
          }
          return Response.json(result, { headers: corsHeaders });
        }

        // GET /api/escalas?data=YYYY-MM-DD
        if (url.pathname === '/api/escalas' && (req.method === 'GET' || req.method === 'HEAD')) {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const result = getEscalaCompleta(data);
          return Response.json(result, { headers: corsHeaders });
        }

        // DELETE /api/escalas/rotas?data=YYYY-MM-DD (Limpar rotas/sujeira - Exclusivo T.I)
        if (url.pathname === '/api/escalas/rotas' && req.method === 'DELETE') {
          const user = getAuthUser(req);
          if (!user || user.perfil !== 'TI') {
            return Response.json({ success: false, error: 'Acesso restrito ao perfil T.I' }, { status: 403, headers: corsHeaders });
          }
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const escala = getOrCreateEscala(data);
          db.query('DELETE FROM viagem_distribuicao WHERE escala_id = ?').run(escala.id);
          broadcast('ESCALA_RELOAD', { data });
          return Response.json({ success: true, message: `Rotas da data ${data} limpas com sucesso.` }, { headers: corsHeaders });
        }

        // GET /api/escalas/periodo?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
        if (url.pathname === '/api/escalas/periodo' && (req.method === 'GET' || req.method === 'HEAD')) {
          const inicio = url.searchParams.get('inicio') || new Date().toISOString().split('T')[0];
          const fim = url.searchParams.get('fim') || inicio;
          const result = getEscalaPeriodo(inicio, fim);
          return Response.json(result, { headers: corsHeaders });
        }

        // GET /api/backup/sqlite (Download do snapshot SQLite - Exclusivo T.I)
        if (url.pathname === '/api/backup/sqlite' && (req.method === 'GET' || req.method === 'HEAD')) {
          const user = getAuthUser(req);
          if (!user || user.perfil !== 'TI') {
            return Response.json({ success: false, error: 'Acesso exclusivo para administradores de T.I' }, { status: 403, headers: corsHeaders });
          }
          const { filename, buffer } = createDatabaseBackup();
          return new Response(buffer, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/x-sqlite3',
              'Content-Disposition': `attachment; filename="${filename}"`
            }
          });
        }

        // POST /api/viagens/distribuicao
        if (url.pathname === '/api/viagens/distribuicao' && req.method === 'POST') {
          const body = await req.json();
          upsertDistribuicao(body);
          broadcast('DISTRIBUICAO_UPDATED', body);
          return Response.json({ success: true, item: body }, { headers: corsHeaders });
        }

        // DELETE /api/viagens/distribuicao/:id
        if (url.pathname.startsWith('/api/viagens/distribuicao/') && req.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          deleteDistribuicao(id);
          broadcast('DISTRIBUICAO_DELETED', { id });
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // POST /api/viagens/transferencia
        if (url.pathname === '/api/viagens/transferencia' && req.method === 'POST') {
          const body = await req.json();
          upsertTransferencia(body);
          broadcast('TRANSFERENCIA_UPDATED', body);
          return Response.json({ success: true, item: body }, { headers: corsHeaders });
        }

        // DELETE /api/viagens/transferencia/:id
        if (url.pathname.startsWith('/api/viagens/transferencia/') && req.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          deleteTransferencia(id);
          broadcast('TRANSFERENCIA_DELETED', { id });
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // POST /api/plantoes
        if (url.pathname === '/api/plantoes' && req.method === 'POST') {
          const body = await req.json();
          upsertPlantao(body);
          broadcast('PLANTAO_UPDATED', body);
          return Response.json({ success: true, item: body }, { headers: corsHeaders });
        }

        // DELETE /api/plantoes/:id
        if (url.pathname.startsWith('/api/plantoes/') && req.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          deletePlantao(id);
          broadcast('PLANTAO_DELETED', { id });
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // POST /api/passagens
        if (url.pathname === '/api/passagens' && req.method === 'POST') {
          const body = await req.json();
          upsertPassagemTurno(body);
          broadcast('PASSAGEM_UPDATED', body);
          return Response.json({ success: true, item: body }, { headers: corsHeaders });
        }

        // DELETE /api/passagens/:id
        if (url.pathname.startsWith('/api/passagens/') && req.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          deletePassagemTurno(id);
          broadcast('PASSAGEM_DELETED', { id });
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // POST /api/temperaturas
        if (url.pathname === '/api/temperaturas' && req.method === 'POST') {
          const body = await req.json();
          upsertTemperaturaCross(body);
          broadcast('TEMPERATURA_UPDATED', body);
          return Response.json({ success: true, item: body }, { headers: corsHeaders });
        }

        // DELETE /api/temperaturas/:id
        if (url.pathname.startsWith('/api/temperaturas/') && req.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          deleteTemperaturaCross(id);
          broadcast('TEMPERATURA_DELETED', { id });
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // POST /api/ajudantes
        if (url.pathname === '/api/ajudantes' && req.method === 'POST') {
          const body = await req.json();
          upsertAjudante(body);
          broadcast('AJUDANTE_UPDATED', body);
          return Response.json({ success: true, item: body }, { headers: corsHeaders });
        }

        // DELETE /api/ajudantes/:id
        if (url.pathname.startsWith('/api/ajudantes/') && req.method === 'DELETE') {
          const id = url.pathname.split('/').pop()!;
          deleteAjudante(id);
          broadcast('AJUDANTE_DELETED', { id });
          return Response.json({ success: true, id }, { headers: corsHeaders });
        }

        // POST /api/import/previa (Gera prévia dos dados antes de salvar no banco)
        if (url.pathname === '/api/import/previa' && req.method === 'POST') {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const escala = getOrCreateEscala(data);
          let distribuicoes: any[] = [];
          let transferencias: any[] = [];
          let duplicadas_detectadas_no_pdf: string[] = [];

          const contentType = req.headers.get('content-type') || '';
          if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const tipo = (formData.get('tipo') as string) || (file?.name.endsWith('.pdf') ? 'pdf' : 'xlsx');
            if (!file) {
              return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400, headers: corsHeaders });
            }
            if (file.size > 25 * 1024 * 1024) {
              return Response.json({ error: 'Arquivo excede o limite máximo permitido de 25MB.' }, { status: 413, headers: corsHeaders });
            }
            if (tipo === 'pdf' || file.name.endsWith('.pdf')) {
              const buffer = Buffer.from(await file.arrayBuffer());
              const parsed = await parsePdfBuffer(buffer, escala.id);
              distribuicoes = parsed.distribuicoes;
              transferencias = parsed.transferencias;
            } else {
              const buffer = await file.arrayBuffer();
              const parsed = parseXlsxBuffer(buffer, escala.id);
              distribuicoes = parsed.distribuicoes;
              transferencias = parsed.transferencias;
            }
          } else {
            const body = await req.json();
            if (body.tipo === 'ia' || body.json) {
              const parsed = parseStructuredAiJson(body.json || body, escala.id);
              distribuicoes = parsed.distribuicoes;
              transferencias = parsed.transferencias;
              duplicadas_detectadas_no_pdf = parsed.duplicadas_detectadas_no_pdf;
            } else {
              const text = body.text || '';
              const parsed = parseRawText(text, escala.id);
              distribuicoes = parsed.distribuicoes;
              transferencias = parsed.transferencias;
            }
          }

          const dup = checkDuplicidades(escala.id, distribuicoes, transferencias);

          return Response.json({
            success: true,
            status: 'PREVIA',
            distribuicoes,
            transferencias,
            total_distribuicoes: distribuicoes.length,
            total_transferencias: transferencias.length,
            rotas_conflitantes: dup.rotas_conflitantes,
            novas_rotas: dup.novas_rotas,
            duplicadas_detectadas_no_pdf
          }, { headers: corsHeaders });
        }

        // POST /api/import/xlsx
        if (url.pathname === '/api/import/xlsx' && req.method === 'POST') {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const confirmado = url.searchParams.get('confirmado') === 'true';
          const modo = (url.searchParams.get('modo') as any) || 'SOBRESCREVER';
          const escala = getOrCreateEscala(data);
          const formData = await req.formData();
          const file = formData.get('file') as File | null;
          if (!file) {
            return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400, headers: corsHeaders });
          }
          if (file.size > 25 * 1024 * 1024) {
            return Response.json({ error: 'Arquivo excede o limite máximo permitido de 25MB.' }, { status: 413, headers: corsHeaders });
          }
          const buffer = await file.arrayBuffer();
          const { distribuicoes, transferencias } = parseXlsxBuffer(buffer, escala.id);

          if (!confirmado) {
            const dup = checkDuplicidades(escala.id, distribuicoes, transferencias);
            if (dup.hasDuplicates) {
              return Response.json({
                status: 'CONFIRMACAO_PENDENTE',
                mensagem: 'Foram encontradas rotas que já existem no sistema para esta data.',
                rotas_conflitantes: dup.rotas_conflitantes,
                novas_rotas: dup.novas_rotas,
                total_duplicadas_pdf: [],
                dados: { distribuicoes, transferencias }
              }, { headers: corsHeaders });
            }
          }

          const result = saveImportedDataWithMode(escala.id, distribuicoes, transferencias, modo);
          broadcast('ESCALA_RELOAD', { data });
          return Response.json({ 
            success: true, 
            status: 'IMPORTADO',
            imported: result.imported,
            modo: result.modo
          }, { headers: corsHeaders });
        }

        // POST /api/import/pdf
        if (url.pathname === '/api/import/pdf' && req.method === 'POST') {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const confirmado = url.searchParams.get('confirmado') === 'true';
          const modo = (url.searchParams.get('modo') as any) || 'SOBRESCREVER';
          const escala = getOrCreateEscala(data);
          const formData = await req.formData();
          const file = formData.get('file') as File | null;
          if (!file) {
            return Response.json({ error: 'Nenhum arquivo PDF enviado' }, { status: 400, headers: corsHeaders });
          }
          if (file.size > 25 * 1024 * 1024) {
            return Response.json({ error: 'Arquivo excede o limite máximo permitido de 25MB.' }, { status: 413, headers: corsHeaders });
          }
          const buffer = Buffer.from(await file.arrayBuffer());
          const { distribuicoes, transferencias } = await parsePdfBuffer(buffer, escala.id);

          if (!confirmado) {
            const dup = checkDuplicidades(escala.id, distribuicoes, transferencias);
            if (dup.hasDuplicates) {
              return Response.json({
                status: 'CONFIRMACAO_PENDENTE',
                mensagem: 'Foram encontradas rotas que já existem no sistema para esta data.',
                rotas_conflitantes: dup.rotas_conflitantes,
                novas_rotas: dup.novas_rotas,
                total_duplicadas_pdf: [],
                dados: { distribuicoes, transferencias }
              }, { headers: corsHeaders });
            }
          }

          const result = saveImportedDataWithMode(escala.id, distribuicoes, transferencias, modo);
          broadcast('ESCALA_RELOAD', { data });
          return Response.json({ 
            success: true, 
            status: 'IMPORTADO',
            imported: result.imported,
            modo: result.modo
          }, { headers: corsHeaders });
        }

        // POST /api/import/text
        if (url.pathname === '/api/import/text' && req.method === 'POST') {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const escala = getOrCreateEscala(data);
          const body = await req.json();
          const text = body.text || '';
          const confirmado = body.confirmado === true || url.searchParams.get('confirmado') === 'true';
          const modo = body.modo || 'SOBRESCREVER';
          const { distribuicoes, transferencias } = parseRawText(text, escala.id);

          if (!confirmado) {
            const dup = checkDuplicidades(escala.id, distribuicoes, transferencias);
            if (dup.hasDuplicates) {
              return Response.json({
                status: 'CONFIRMACAO_PENDENTE',
                mensagem: 'Foram encontradas rotas que já existem no sistema para esta data.',
                rotas_conflitantes: dup.rotas_conflitantes,
                novas_rotas: dup.novas_rotas,
                total_duplicadas_pdf: [],
                dados: { distribuicoes, transferencias }
              }, { headers: corsHeaders });
            }
          }

          const result = saveImportedDataWithMode(escala.id, distribuicoes, transferencias, modo);
          broadcast('ESCALA_RELOAD', { data });
          return Response.json({ 
            success: true, 
            status: 'IMPORTADO',
            imported: result.imported,
            modo: result.modo
          }, { headers: corsHeaders });
        }

        // POST /api/import/ia
        if (url.pathname === '/api/import/ia' && req.method === 'POST') {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const escala = getOrCreateEscala(data);
          const body = await req.json();
          const rawInput = body.json || body;
          const confirmado = body.confirmado === true || url.searchParams.get('confirmado') === 'true';
          const modo = body.modo || 'SOBRESCREVER';

          const { distribuicoes, transferencias, duplicadas_detectadas_no_pdf } = parseStructuredAiJson(rawInput, escala.id);

          if (!confirmado) {
            const dup = checkDuplicidades(escala.id, distribuicoes, transferencias);
            if (dup.hasDuplicates) {
              return Response.json({
                status: 'CONFIRMACAO_PENDENTE',
                mensagem: 'Foram encontradas rotas que já existem no sistema para esta data.',
                rotas_conflitantes: dup.rotas_conflitantes,
                novas_rotas: dup.novas_rotas,
                total_duplicadas_pdf: duplicadas_detectadas_no_pdf,
                dados: { distribuicoes, transferencias }
              }, { headers: corsHeaders });
            }
          }

          const result = saveImportedDataWithMode(escala.id, distribuicoes, transferencias, modo);
          broadcast('ESCALA_RELOAD', { data });
          return Response.json({ 
            success: true, 
            status: 'IMPORTADO',
            imported: result.imported,
            modo: result.modo,
            duplicadas_detectadas_no_pdf
          }, { headers: corsHeaders });
        }

        // POST /api/import/confirmar
        if (url.pathname === '/api/import/confirmar' && req.method === 'POST') {
          const body = await req.json();
          const data = body.data || url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const modo = body.modo || 'SOBRESCREVER';
          const escala = getOrCreateEscala(data);
          const distribuicoes = body.distribuicoes || [];
          const transferencias = body.transferencias || [];

          const result = saveImportedDataWithMode(escala.id, distribuicoes, transferencias, modo);
          broadcast('ESCALA_RELOAD', { data });
          return Response.json({
            success: true,
            status: 'IMPORTADO',
            imported: result.imported,
            modo: result.modo
          }, { headers: corsHeaders });
        }

        // GET /api/export/xlsx
        if (url.pathname === '/api/export/xlsx' && (req.method === 'GET' || req.method === 'HEAD')) {
          const data = url.searchParams.get('data') || new Date().toISOString().split('T')[0];
          const { distribuicoes, transferencias, plantoes, passagens, temperaturas, ajudantes } = getEscalaCompleta(data);

          const wb = XLSX.utils.book_new();

          // Sheet 1: Distribuição (com todos os novos campos do front)
          const distRows = distribuicoes.map(d => ({
            'EMBARQUE RCS': d.embarque_cod || 'SEM EMBARQUE',
            'DOCA': d.doca,
            'HORA ENCOSTE': d.hora_encoste_previsto,
            'ROTA': d.rota,
            'TIPO VEÍCULO': d.tipo_veiculo,
            'PLACA CAVALO': d.placa_cavalo,
            'PLACA CARRETA': d.placa_carreta,
            'VÍNCULO GOBRAX': d.vinculo_gobrax || 'DESVINCULADO',
            'MOTORISTA': d.motorista_nome,
            'MOTORISTA RESTRITO': d.motorista_restrito ? 'SIM (OBRIGATÓRIO AJUDANTE)' : 'NÃO',
            'AJUDANTE 1': d.ajudante_1,
            'AJUDANTE 2': d.ajudante_2,
            '1ª LOJA': d.primeira_entrega,
            'PREVISTO 1ª LOJA': d.horario_primeira_entrega,
            'REAL 1ª LOJA': d.horario_real_primeira_loja || '',
            'STATUS 1ª LOJA': d.status_primeira_loja || 'PENDENTE',
            'LOJAS (SEQUÊNCIA)': d.lojas,
            'HORÁRIO SAÍDA': d.hora_saida_motorista,
            'SAÍDA REAL': d.horario_saida_real || '',
            'JUSTIFICATIVA ATRASO': d.justificativa_saida,
            'HORÁRIO ÚLTIMA LOJA': d.hora_ultima_loja,
            'RETORNO PREVISTO (+4H)': d.retorno_previsto,
            'PIRÔMETRO': d.pirometro || '',
            'M³': d.volume_m3,
            'CAIXAS': d.qtd_caixas || 0,
            'DIÁRIA EFETIVA': d.valor_diaria,
            'STATUS DIÁRIA': d.status_diaria,
            'STATUS CARREGAMENTO': d.status_carregamento,
            'OBSERVAÇÕES': d.observacoes
          }));
          const wsDist = XLSX.utils.json_to_sheet(distRows);
          XLSX.utils.book_append_sheet(wb, wsDist, 'Distribuição');

          // Sheet 2: Transferências
          const transfRows = transferencias.map(t => ({
            'OPERAÇÃO / ROTA': t.operacao_rota,
            'CONDUTOR': t.motorista_nome,
            'PLACA': t.placa,
            'VÍNCULO GOBRAX': t.vinculo_gobrax || 'DESVINCULADO',
            'PEGADA / INÍCIO': t.horario_pegada,
            'HORÁRIO FIM': t.horario_fim,
            'HORÁRIO LIMITE': t.horario_limite,
            'STATUS OPERACIONAL': t.status_operacional,
            'STATUS JORNADA': t.status_jornada,
            'DURAÇÃO': t.duracao_horas,
            'VALOR DIÁRIA': t.valor_diaria || 0,
            'STATUS DIÁRIA': t.status_diaria || 'Pendente',
            'OBSERVAÇÕES': t.observacoes_transferencia
          }));
          const wsTransf = XLSX.utils.json_to_sheet(transfRows);
          XLSX.utils.book_append_sheet(wb, wsTransf, 'Transferências');

          // Sheet 3: Controle de Ajudantes (Página 2 do PDF)
          const ajudanteRows = (ajudantes || []).map(a => ({
            'NOME AJUDANTE': a.nome_ajudante,
            'PRESTADOR': a.prestador,
            'ROTA': a.rota,
            'MOTORISTA': a.motorista_nome,
            'DATA INÍCIO': a.data_inicio,
            'HORA INÍCIO': a.horario_inicio,
            'HORA CHEGADA': a.horario_chegada,
            'HORA FIM': a.horario_fim,
            'OBSERVAÇÃO / RETORNO RCS': a.obs
          }));
          const wsAjudantes = XLSX.utils.json_to_sheet(ajudanteRows);
          XLSX.utils.book_append_sheet(wb, wsAjudantes, 'Controle Ajudantes');

          // Sheet 4: Passagem de Turno
          const passagensRows = passagens.map(p => ({
            'TURNO': p.turno,
            'ITEM': p.item_num,
            'DESCRIÇÃO': p.descricao,
            'OBSERVAÇÃO': p.observacao,
            'STATUS': p.status
          }));
          const wsPassagens = XLSX.utils.json_to_sheet(passagensRows);
          XLSX.utils.book_append_sheet(wb, wsPassagens, 'Passagem de Turno');

          // Sheet 5: Temperatura Cross CD-JD
          const tempRows = temperaturas.map(t => ({
            'CAVALO': t.cavalo,
            'CARRETA': t.carreta,
            'CONGELADO': t.temperatura_congelado,
            'RESFRIADO': t.temperatura_resfriado,
            'FORA DA FAIXA': t.fora_da_faixa ? 'SIM - CHAMAR TÉCNICO' : 'NORMAL',
            'HORÁRIO': t.horario_afericao
          }));
          const wsTemp = XLSX.utils.json_to_sheet(tempRows);
          XLSX.utils.book_append_sheet(wb, wsTemp, 'Temperatura Cross');

          // Sheet 6: Plantão
          const plantaoRows = plantoes.map(p => ({
            'MOTORISTA': p.motorista_nome,
            'HORÁRIO APRESENTAÇÃO': p.horario_plantao,
            'STATUS CONTATO': p.status_contato,
            'OBSERVAÇÕES': p.observacoes
          }));
          const wsPlantao = XLSX.utils.json_to_sheet(plantaoRows);
          XLSX.utils.book_append_sheet(wb, wsPlantao, 'Plantões');

          const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
          return new Response(buf, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': `attachment; filename="Escala_Logistica_${data}.xlsx"`
            }
          });
        }

        return Response.json({ error: 'Rota não encontrada' }, { status: 404, headers: corsHeaders });
      } catch (err: any) {
        console.error('API Error:', err);
        return Response.json({ error: err.message || 'Erro interno' }, { status: 500, headers: corsHeaders });
      }
    }

    // 3. Servir arquivos estáticos do Frontend (dist)
    let filePath = path.join(distDir, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      return new Response(Bun.file(filePath));
    }

    return new Response('Torre de Controle Logístico API rodando.', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  },

  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ event: 'CONNECTED', clientsCount: clients.size }));
      broadcast('CLIENTS_COUNT', { count: clients.size });
    },
    message(ws, message) {
      try {
        const parsed = JSON.parse(String(message));
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch {}
    },
    close(ws) {
      clients.delete(ws);
      broadcast('CLIENTS_COUNT', { count: clients.size });
    }
  }
});

console.log(`🚀 Logistics Control Tower Server rodando em http://localhost:${PORT}`);
