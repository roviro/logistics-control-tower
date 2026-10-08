import { Database } from 'bun:sqlite';
import { 
  EscalaCompleta, 
  EscalaDia, 
  PlantaoReserva, 
  ViagemDistribuicao, 
  ViagemTransferencia, 
  PassagemTurnoItem, 
  TemperaturaCrossItem,
  AjudanteOperacao,
  UsuarioLogado,
  PerfilUsuario
} from '../types';
import { 
  calcularDuracao, 
  calcularHorarioLimite, 
  avaliarStatusJornada, 
  calcularRetornoPrevisto, 
  avaliarTemperaturaCross,
  avaliarConformidadePrimeiraLoja,
  getEncosteOperationalMinutes,
  timeToMinutes
} from '../utils/jornada';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'logistics.db'), { create: true });
// Otimizações de Performance SQLite (database-optimizer & sql-optimization)
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA cache_size = -64000;'); // 64MB cache em memória

// Inicialização das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS escala_dia (
    id TEXT PRIMARY KEY,
    data_operacao TEXT UNIQUE,
    criado_em TEXT,
    atualizado_por TEXT
  );

  CREATE TABLE IF NOT EXISTS viagem_distribuicao (
    id TEXT PRIMARY KEY,
    escala_id TEXT,
    embarque_cod TEXT,
    rota TEXT,
    tipo_veiculo TEXT,
    doca TEXT,
    hora_encoste_previsto TEXT,
    hora_saida_motorista TEXT,
    horario_saida_real TEXT,
    justificativa_saida TEXT,
    qtd_lojas INTEGER,
    lojas TEXT,
    volume_m3 REAL,
    qtd_caixas INTEGER DEFAULT 0,
    primeira_entrega TEXT,
    horario_primeira_entrega TEXT,
    horario_real_primeira_loja TEXT,
    status_primeira_loja TEXT,
    hora_ultima_loja TEXT,
    retorno_previsto TEXT,
    pirometro TEXT,
    placa_cavalo TEXT,
    placa_carreta TEXT,
    vinculo_gobrax TEXT DEFAULT 'DESVINCULADO',
    motorista_nome TEXT,
    motorista_restrito INTEGER DEFAULT 0,
    ajudante_1 TEXT,
    ajudante_2 TEXT,
    observacoes TEXT,
    data_saida_condutor TEXT,
    fornecedor_ajudante TEXT,
    valor_diaria REAL,
    status_diaria TEXT,
    status_motorista TEXT,
    status_carregamento TEXT,
    ordem INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS viagem_transferencia (
    id TEXT PRIMARY KEY,
    escala_id TEXT,
    operacao_rota TEXT,
    motorista_nome TEXT,
    placa TEXT,
    placa_carreta TEXT,
    vinculo_gobrax TEXT DEFAULT 'DESVINCULADO',
    horario_pegada TEXT,
    horario_fim TEXT,
    horario_limite TEXT,
    limite_horas TEXT,
    status_operacional TEXT,
    status_jornada TEXT,
    duracao_horas TEXT,
    valor_diaria REAL DEFAULT 0,
    status_diaria TEXT DEFAULT 'Pendente',
    observacoes_transferencia TEXT,
    ultima_atualizacao TEXT
  );

  CREATE TABLE IF NOT EXISTS plantao_reserva (
    id TEXT PRIMARY KEY,
    escala_id TEXT,
    motorista_nome TEXT,
    horario_plantao TEXT,
    status_contato TEXT,
    observacoes TEXT
  );

  CREATE TABLE IF NOT EXISTS passagem_turno (
    id TEXT PRIMARY KEY,
    escala_id TEXT,
    turno TEXT,
    item_num INTEGER,
    descricao TEXT,
    observacao TEXT,
    status TEXT,
    criado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS temperatura_cross (
    id TEXT PRIMARY KEY,
    escala_id TEXT,
    cavalo TEXT,
    carreta TEXT,
    temperatura_congelado TEXT,
    temperatura_resfriado TEXT,
    fora_da_faixa INTEGER,
    observacoes TEXT,
    horario_afericao TEXT
  );

  CREATE TABLE IF NOT EXISTS escala_ajudantes (
    id TEXT PRIMARY KEY,
    escala_id TEXT,
    nome_ajudante TEXT,
    prestador TEXT,
    rota TEXT,
    motorista_nome TEXT,
    data_inicio TEXT,
    horario_inicio TEXT,
    horario_chegada TEXT,
    horario_fim TEXT,
    obs TEXT
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL, -- 'TI' ou 'ADM'
    ativo INTEGER DEFAULT 1,
    criado_em TEXT,
    ultimo_login TEXT
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );
`);

// Migrações seguras para colunas adicionadas
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN justificativa_saida TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN hora_ultima_loja TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN retorno_previsto TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN horario_saida_real TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN qtd_caixas INTEGER DEFAULT 0;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN horario_real_primeira_loja TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN status_primeira_loja TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN pirometro TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN vinculo_gobrax TEXT DEFAULT 'DESVINCULADO';"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN motorista_restrito INTEGER DEFAULT 0;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN data_saida_condutor TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN fornecedor_ajudante TEXT;"); } catch {}
try { db.exec("ALTER TABLE viagem_distribuicao ADD COLUMN ordem INTEGER DEFAULT 0;"); } catch {}

try { db.exec("ALTER TABLE viagem_transferencia ADD COLUMN valor_diaria REAL DEFAULT 0;"); } catch {}
try { db.exec("ALTER TABLE viagem_transferencia ADD COLUMN status_diaria TEXT DEFAULT 'Pendente';"); } catch {}
try { db.exec("ALTER TABLE viagem_transferencia ADD COLUMN vinculo_gobrax TEXT DEFAULT 'DESVINCULADO';"); } catch {}
try { db.exec("ALTER TABLE viagem_transferencia ADD COLUMN placa_carreta TEXT;"); } catch {}

// Índices B-Tree Estratégicos (database-optimizer & sql-optimization)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_dist_escala ON viagem_distribuicao(escala_id);
  CREATE INDEX IF NOT EXISTS idx_dist_rota ON viagem_distribuicao(rota);
  CREATE INDEX IF NOT EXISTS idx_dist_doca ON viagem_distribuicao(doca);
  CREATE INDEX IF NOT EXISTS idx_dist_ordem ON viagem_distribuicao(ordem);
  CREATE INDEX IF NOT EXISTS idx_transf_escala ON viagem_transferencia(escala_id);
  CREATE INDEX IF NOT EXISTS idx_transf_rota ON viagem_transferencia(operacao_rota);
  CREATE INDEX IF NOT EXISTS idx_plantao_escala ON plantao_reserva(escala_id);
  CREATE INDEX IF NOT EXISTS idx_passagem_escala ON passagem_turno(escala_id);
  CREATE INDEX IF NOT EXISTS idx_temp_escala ON temperatura_cross(escala_id);
  CREATE INDEX IF NOT EXISTS idx_ajudantes_escala ON escala_ajudantes(escala_id);
  CREATE INDEX IF NOT EXISTS idx_escala_data ON escala_dia(data_operacao);
  CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
  CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(token);
  CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);
`);

export function getOrCreateEscala(dataOperacao: string): EscalaDia {
  let escala = db.query<EscalaDia, [string]>('SELECT * FROM escala_dia WHERE data_operacao = ?').get(dataOperacao);
  if (!escala) {
    escala = {
      id: crypto.randomUUID(),
      data_operacao: dataOperacao,
      criado_em: new Date().toISOString(),
      atualizado_por: 'Operador Padrão'
    };
    db.query(`
      INSERT INTO escala_dia (id, data_operacao, criado_em, atualizado_por)
      VALUES ($id, $data_operacao, $criado_em, $atualizado_por)
    `).run({
      $id: escala.id,
      $data_operacao: escala.data_operacao,
      $criado_em: escala.criado_em,
      $atualizado_por: escala.atualizado_por
    });
  }
  return escala;
}

export function getEscalaCompleta(dataOperacao: string): EscalaCompleta {
  const escala = getOrCreateEscala(dataOperacao);
  
  let distribuicoes = db.query<ViagemDistribuicao, [string]>(
    'SELECT * FROM viagem_distribuicao WHERE escala_id = ? ORDER BY hora_encoste_previsto ASC, ordem ASC, rowid ASC'
  ).all(escala.id);

  // Recalcular retorno previsto e conformidade de primeira loja
  distribuicoes = distribuicoes.map((d: ViagemDistribuicao) => {
    let ret = d.retorno_previsto;
    if (!ret && d.hora_ultima_loja) {
      ret = calcularRetornoPrevisto(d.hora_ultima_loja, 4);
    }

    const { status: status1Loja } = avaliarConformidadePrimeiraLoja(
      d.horario_primeira_entrega,
      d.horario_real_primeira_loja || ''
    );

    return {
      ...d,
      retorno_previsto: ret,
      status_primeira_loja: d.status_primeira_loja || status1Loja,
      vinculo_gobrax: d.vinculo_gobrax || 'DESVINCULADO',
      motorista_restrito: Boolean(d.motorista_restrito)
    };
  });

  // Ordenação operacional rigorosa por Horário de Encoste do CD (11:00 -> 09:00), ordem do PDF e doca
  distribuicoes.sort((a: ViagemDistribuicao, b: ViagemDistribuicao) => {
    const minA = getEncosteOperationalMinutes(a.hora_encoste_previsto);
    const minB = getEncosteOperationalMinutes(b.hora_encoste_previsto);
    if (minA !== minB) return minA - minB;
    const ordA = a.ordem !== undefined && a.ordem !== null ? a.ordem : 999999;
    const ordB = b.ordem !== undefined && b.ordem !== null ? b.ordem : 999999;
    if (ordA !== ordB) return ordA - ordB;
    const docaA = parseInt(a.doca, 10) || 999;
    const docaB = parseInt(b.doca, 10) || 999;
    return docaA - docaB;
  });

  let transferencias = db.query<ViagemTransferencia, [string]>(
    'SELECT * FROM viagem_transferencia WHERE escala_id = ? ORDER BY horario_pegada ASC'
  ).all(escala.id);

  transferencias = transferencias.map((t: ViagemTransferencia) => {
    let horarioFim = t.horario_fim || '';
    let statusOperacional = t.status_operacional || 'INICIANDO';
    if (horarioFim && (statusOperacional === 'INICIANDO' || statusOperacional === 'AGUARDANDO LIBERACAO')) {
      statusOperacional = 'FINALIZADO';
    }
    const duracao = calcularDuracao(t.horario_pegada, horarioFim);
    const limiteHoras = t.limite_horas || '11:20';
    const horarioLimite = calcularHorarioLimite(t.horario_pegada, limiteHoras);
    const { status: statusJornada } = avaliarStatusJornada(t.horario_pegada, horarioFim, limiteHoras, undefined, statusOperacional);
    return {
      ...t,
      status_operacional: statusOperacional,
      limite_horas: limiteHoras,
      horario_limite: horarioLimite,
      duracao_horas: duracao,
      status_jornada: statusJornada,
      vinculo_gobrax: t.vinculo_gobrax || 'DESVINCULADO',
      status_diaria: t.status_diaria || 'Pendente',
      valor_diaria: t.valor_diaria || 0
    };
  });

  const plantoes = db.query<PlantaoReserva, [string]>(
    'SELECT * FROM plantao_reserva WHERE escala_id = ? ORDER BY horario_plantao ASC'
  ).all(escala.id);

  let passagens = db.query<PassagemTurnoItem, [string]>(
    'SELECT * FROM passagem_turno WHERE escala_id = ? ORDER BY turno ASC, item_num ASC'
  ).all(escala.id);

  if (passagens.length === 0) {
    seedPassagensPadrao(escala.id);
    passagens = db.query<PassagemTurnoItem, [string]>(
      'SELECT * FROM passagem_turno WHERE escala_id = ? ORDER BY turno ASC, item_num ASC'
    ).all(escala.id);
  }

  let temperaturas = db.query<any, [string]>(
    'SELECT * FROM temperatura_cross WHERE escala_id = ? ORDER BY horario_afericao ASC, cavalo ASC'
  ).all(escala.id);

  if (temperaturas.length === 0) {
    seedTemperaturasPadrao(escala.id);
    temperaturas = db.query<any, [string]>(
      'SELECT * FROM temperatura_cross WHERE escala_id = ? ORDER BY horario_afericao ASC, cavalo ASC'
    ).all(escala.id);
  }

  const temperaturasFinal: TemperaturaCrossItem[] = temperaturas.map((t: any) => {
    const { foraDaFaixa } = avaliarTemperaturaCross(t.temperatura_congelado, t.temperatura_resfriado);
    return {
      ...t,
      fora_da_faixa: foraDaFaixa
    };
  });

  let ajudantes = db.query<AjudanteOperacao, [string]>(
    'SELECT * FROM escala_ajudantes WHERE escala_id = ? ORDER BY horario_inicio ASC, nome_ajudante ASC'
  ).all(escala.id);

  if (ajudantes.length === 0) {
    seedAjudantesPadrao(escala.id);
    ajudantes = db.query<AjudanteOperacao, [string]>(
      'SELECT * FROM escala_ajudantes WHERE escala_id = ? ORDER BY horario_inicio ASC, nome_ajudante ASC'
    ).all(escala.id);
  }

  return { 
    escala, 
    distribuicoes, 
    transferencias, 
    plantoes, 
    passagens, 
    temperaturas: temperaturasFinal,
    ajudantes 
  };
}

function seedPassagensPadrao(escalaId: string) {
  const itens = [
    { item_num: 1, descricao: 'ROTA: ON720M ( MOTORISTA: DIEGO ) MOTORISTA ESTAVA REALIZANDO A ENTREGA NA LOJA: OSC, PORÉM ACABOU CAINDO ALGUMAS BANDEJAS EM UM VEÍCULO TERCEIRO ( MOTORISTA DO VEÍCULO TERCEIRO ALEGOU QUE COM A QUEDA DAS BANDEJAS GEROU UMA AVARIA NO PARA-CHOQUE DE SEU VEÍCULO ) MOTORISTA ORIENTADO PARA PREENCHER O B.I ( DEMAIS INFORMAÇÕES ENVIADAS POR E-MAIL )', observacao: 'ACOMPANHAR', status: 'NÃO REALIZADO' },
    { item_num: 2, descricao: 'HAVERA ENTREGA EX1S1O DIA 02/10', observacao: 'ACOMPANHAR NF\'S NO ACRILICO', status: 'NÃO REALIZADO' },
    { item_num: 3, descricao: 'ROTA ON214M: MOTORISTA SINESIO DESCARREGOU 24CX DE BATATA NA LOJA PZS, PORÉM O MOTORISTA ESQUECEU DE COLETAR ASSINATURA DOS CANHOTOS... ENVIAR PARA COLETAR ASSINATURA NA PROXIMA ENTREGA.', observacao: 'ACOMPANHAR PRELIMINAR', status: 'NÃO REALIZADO' },
    { item_num: 4, descricao: 'ROTA: ON327M ( MOTORISTA: MACIEL ) MOTORISTA ENVIOU MENSAGEM DIZENDO QUE PERDEU O HORÁRIO, SENDO ASSIM A ROTA FOI REALIZADA ATRAVÉS DO MOTORISTA: PAZ ( PARA A ROTA QUE SERIA DO MOTORISTA: PAZ ESTA EM TRÂNSITO ATRAVÉS DO MOTORISTA: MACIEL )', observacao: 'FINALIZADO', status: 'REALIZADO' },
    { item_num: 5, descricao: 'LIBERAÇÃO DE ROTAS ( CONFORME E-MAIL ENVIADO PELO SUPORTE OPERACIONAL, AS ROTAS FORAM LIBERADAS COM ATRASOS DEVIDO AGUARDAR AS EMISSÕES DAS NFS )', observacao: 'INFORMATIVO', status: 'REALIZADO' },
    { item_num: 6, descricao: 'FORAM LIBERADAS 08 ROTAS SEM NOTAS FISCAIS ( ROTAS LIBERADAS COM ESPELHO DOS PRODUTOS )', observacao: 'INFORMATIVO', status: 'REALIZADO' },
    { item_num: 7, descricao: 'ROTAS DO LITORAL ( ROTA: ON366M - MOTORISTA: SIQUEIRA ) ( ROTA: ON365M - MOTORISTA: DUARTE ) ROTAS LIBERADAS SEM NOTAS FISCAIS ( POR FAVOR, ENVIAR ESSAS NFS ATRAVÉS DO MOTORISTA: EWERTON PARA QUE O MESMO POSSA ENTREGAR AS NFS NAS LOJAS )', observacao: 'EM ANDAMENTO', status: 'NÃO REALIZADO' }
  ];

  const stmt = db.prepare(`
    INSERT INTO passagem_turno (id, escala_id, turno, item_num, descricao, observacao, status, criado_em)
    VALUES ($id, $escala_id, $turno, $item_num, $descricao, $observacao, $status, $criado_em)
  `);

  for (const item of itens) {
    stmt.run({
      $id: crypto.randomUUID(),
      $escala_id: escalaId,
      $turno: 'T3',
      $item_num: item.item_num,
      $descricao: item.descricao,
      $observacao: item.observacao,
      $status: item.status,
      $criado_em: new Date().toISOString()
    });
  }
}

function seedTemperaturasPadrao(escalaId: string) {
  const itens = [
    { cavalo: 'FYR6A78', carreta: 'EGJ8729', cong: '-20', resf: '2', obs: '' },
    { cavalo: 'FAQ4G29', carreta: 'FSI8417', cong: '-18', resf: '3', obs: '' },
    { cavalo: 'GKD3A99', carreta: 'EKH7433', cong: '-22', resf: '1', obs: '' },
    { cavalo: 'GHL9G62', carreta: 'CPV9A01', cong: '-20', resf: '1', obs: '' },
    { cavalo: 'EXCEDENTE', carreta: 'EGJ7769', cong: 'SECO', resf: 'SECO', obs: 'Carga Seca' }
  ];

  const stmt = db.prepare(`
    INSERT INTO temperatura_cross (
      id, escala_id, cavalo, carreta, temperatura_congelado, temperatura_resfriado,
      fora_da_faixa, observacoes, horario_afericao
    ) VALUES (
      $id, $escala_id, $cavalo, $carreta, $cong, $resf, $fora, $obs, $hora
    )
  `);

  for (const item of itens) {
    const { foraDaFaixa } = avaliarTemperaturaCross(item.cong, item.resf);
    stmt.run({
      $id: crypto.randomUUID(),
      $escala_id: escalaId,
      $cavalo: item.cavalo,
      $carreta: item.carreta,
      $cong: item.cong,
      $resf: item.resf,
      $fora: foraDaFaixa ? 1 : 0,
      $obs: item.obs,
      $hora: '10:00'
    });
  }
}

function seedAjudantesPadrao(escalaId: string) {
  const itens = [
    { nome: 'ALEXANDRE', prestador: 'AJUDANTE RHELP', rota: 'SP637M', motorista: 'VIEIRA', data: '01/10/2026', inicio: '02:00', chegada: '02:00', fim: '11:31', obs: 'FINALIZADO' },
    { nome: 'ROBERTO', prestador: 'AJUDANTE LED', rota: 'SP631M', motorista: 'CLAUDEMIR', data: '01/10/2026', inicio: '04:00', chegada: '04:00', fim: '16:10', obs: 'FINALIZADO' },
    { nome: 'CHARLES', prestador: 'AJUDANTE LED', rota: 'SP641M', motorista: 'MEDINA', data: '01/10/2026', inicio: '04:00', chegada: '04:00', fim: '09:30', obs: 'FINALIZADO' },
    { nome: 'RAPHAEL', prestador: 'AJUDANTE RHELP', rota: 'SP644M', motorista: 'AUGUSTO', data: '01/10/2026', inicio: '05:00', chegada: '05:00', fim: '10:27', obs: 'FINALIZADO' },
    { nome: 'WESLEY', prestador: 'AJUDANTE LED', rota: 'SP650M', motorista: 'EDMAR', data: '01/10/2026', inicio: '05:00', chegada: '05:00', fim: '10:31', obs: 'FINALIZADO' }
  ];

  const stmt = db.prepare(`
    INSERT INTO escala_ajudantes (
      id, escala_id, nome_ajudante, prestador, rota, motorista_nome, data_inicio,
      horario_inicio, horario_chegada, horario_fim, obs
    ) VALUES (
      $id, $escala_id, $nome, $prestador, $rota, $motorista, $data,
      $inicio, $chegada, $fim, $obs
    )
  `);

  for (const item of itens) {
    stmt.run({
      $id: crypto.randomUUID(),
      $escala_id: escalaId,
      $nome: item.nome,
      $prestador: item.prestador,
      $rota: item.rota,
      $motorista: item.motorista,
      $data: item.data,
      $inicio: item.inicio,
      $chegada: item.chegada,
      $fim: item.fim,
      $obs: item.obs
    });
  }
}

export function checkDuplicidades(
  escalaId: string, 
  distribuicoes: ViagemDistribuicao[], 
  transferencias: ViagemTransferencia[]
) {
  const rotasDistDb = db.query<{ rota: string }, [string]>(
    'SELECT rota FROM viagem_distribuicao WHERE escala_id = ?'
  ).all(escalaId).map(r => (r.rota || '').trim().toUpperCase()).filter(Boolean);

  const rotasTransfDb = db.query<{ operacao_rota: string; horario_pegada: string }, [string]>(
    'SELECT operacao_rota, horario_pegada FROM viagem_transferencia WHERE escala_id = ?'
  ).all(escalaId);

  const existingDistSet = new Set(rotasDistDb);
  const existingTransfKeys = new Set(
    rotasTransfDb.map(t => `${(t.operacao_rota || '').trim().toUpperCase()}__${(t.horario_pegada || '').trim()}`)
  );

  const rotas_conflitantes: string[] = [];
  const novas_rotas: string[] = [];

  for (const d of distribuicoes) {
    const key = (d.rota || d.embarque_cod || '').trim().toUpperCase();
    if (!key) continue;
    if (existingDistSet.has(key)) {
      if (!rotas_conflitantes.includes(key)) rotas_conflitantes.push(key);
    } else {
      if (!novas_rotas.includes(key)) novas_rotas.push(key);
    }
  }

  for (const t of transferencias) {
    const rotaKey = (t.operacao_rota || '').trim().toUpperCase();
    if (!rotaKey) continue;
    const fullKey = `${rotaKey}__${(t.horario_pegada || '').trim()}`;
    const displayLabel = t.horario_pegada ? `${rotaKey} [${t.horario_pegada}]` : rotaKey;
    if (existingTransfKeys.has(fullKey)) {
      if (!rotas_conflitantes.includes(displayLabel)) rotas_conflitantes.push(displayLabel);
    } else {
      if (!novas_rotas.includes(displayLabel)) novas_rotas.push(displayLabel);
    }
  }

  return {
    hasDuplicates: rotas_conflitantes.length > 0,
    rotas_conflitantes,
    novas_rotas
  };
}

export function saveImportedData(escalaId: string, distribuicoes: ViagemDistribuicao[], transferencias: ViagemTransferencia[]) {
  const maxRow = db.query<{ max_ordem: number | null }, [string]>(
    'SELECT MAX(ordem) as max_ordem FROM viagem_distribuicao WHERE escala_id = ?'
  ).get(escalaId);
  const currentMaxOrdem = maxRow?.max_ordem || 0;

  const insertDist = db.prepare(`
    INSERT OR REPLACE INTO viagem_distribuicao (
      id, escala_id, embarque_cod, rota, tipo_veiculo, doca, hora_encoste_previsto,
      hora_saida_motorista, horario_saida_real, justificativa_saida, qtd_lojas, lojas,
      volume_m3, qtd_caixas, primeira_entrega, horario_primeira_entrega, horario_real_primeira_loja,
      status_primeira_loja, hora_ultima_loja, retorno_previsto, pirometro, placa_cavalo,
      placa_carreta, vinculo_gobrax, motorista_nome, motorista_restrito, ajudante_1,
      ajudante_2, observacoes, data_saida_condutor, fornecedor_ajudante, valor_diaria, status_diaria, status_motorista, status_carregamento, ordem
    ) VALUES (
      $id, $escala_id, $embarque_cod, $rota, $tipo_veiculo, $doca, $hora_encoste_previsto,
      $hora_saida_motorista, $horario_saida_real, $justificativa_saida, $qtd_lojas, $lojas,
      $volume_m3, $qtd_caixas, $primeira_entrega, $horario_primeira_entrega, $horario_real_primeira_loja,
      $status_primeira_loja, $hora_ultima_loja, $retorno_previsto, $pirometro, $placa_cavalo,
      $placa_carreta, $vinculo_gobrax, $motorista_nome, $motorista_restrito, $ajudante_1,
      $ajudante_2, $observacoes, $data_saida_condutor, $fornecedor_ajudante, $valor_diaria, $status_diaria, $status_motorista, $status_carregamento, $ordem
    )
  `);

  const insertTransf = db.prepare(`
    INSERT OR REPLACE INTO viagem_transferencia (
      id, escala_id, operacao_rota, motorista_nome, placa, placa_carreta, vinculo_gobrax, horario_pegada,
      horario_fim, horario_limite, limite_horas, status_operacional, status_jornada,
      duracao_horas, valor_diaria, status_diaria, observacoes_transferencia, ultima_atualizacao
    ) VALUES (
      $id, $escala_id, $operacao_rota, $motorista_nome, $placa, $placa_carreta, $vinculo_gobrax, $horario_pegada,
      $horario_fim, $horario_limite, $limite_horas, $status_operacional, $status_jornada,
      $duracao_horas, $valor_diaria, $status_diaria, $observacoes_transferencia, $ultima_atualizacao
    )
  `);

  db.transaction(() => {
    let idx = 0;
    for (const d of distribuicoes) {
      idx++;
      const itemOrdem = d.ordem !== undefined && d.ordem > 0 
        ? (currentMaxOrdem + d.ordem) 
        : (currentMaxOrdem + idx);

      insertDist.run({
        $id: d.id,
        $escala_id: escalaId,
        $embarque_cod: d.embarque_cod,
        $rota: d.rota,
        $tipo_veiculo: d.tipo_veiculo,
        $doca: d.doca,
        $hora_encoste_previsto: d.hora_encoste_previsto,
        $hora_saida_motorista: d.hora_saida_motorista,
        $horario_saida_real: d.horario_saida_real || d.hora_saida_motorista || '',
        $justificativa_saida: d.justificativa_saida || '',
        $qtd_lojas: d.qtd_lojas,
        $lojas: d.lojas,
        $volume_m3: d.volume_m3,
        $qtd_caixas: d.qtd_caixas || 0,
        $primeira_entrega: d.primeira_entrega,
        $horario_primeira_entrega: d.horario_primeira_entrega,
        $horario_real_primeira_loja: d.horario_real_primeira_loja || '',
        $status_primeira_loja: d.status_primeira_loja || 'PENDENTE',
        $hora_ultima_loja: d.hora_ultima_loja || '',
        $retorno_previsto: d.retorno_previsto || '',
        $pirometro: d.pirometro || '',
        $placa_cavalo: d.placa_cavalo,
        $placa_carreta: d.placa_carreta,
        $vinculo_gobrax: d.vinculo_gobrax || 'DESVINCULADO',
        $motorista_nome: d.motorista_nome,
        $motorista_restrito: d.motorista_restrito ? 1 : 0,
        $ajudante_1: d.ajudante_1,
        $ajudante_2: d.ajudante_2,
        $observacoes: d.observacoes,
        $data_saida_condutor: d.data_saida_condutor || '',
        $fornecedor_ajudante: d.fornecedor_ajudante || '',
        $valor_diaria: d.valor_diaria,
        $status_diaria: d.status_diaria,
        $status_motorista: d.status_motorista,
        $status_carregamento: d.status_carregamento,
        $ordem: itemOrdem
      });
    }

    for (const t of transferencias) {
      insertTransf.run({
        $id: t.id,
        $escala_id: escalaId,
        $operacao_rota: t.operacao_rota,
        $motorista_nome: t.motorista_nome,
        $placa: t.placa,
        $placa_carreta: t.placa_carreta || '',
        $vinculo_gobrax: t.vinculo_gobrax || 'DESVINCULADO',
        $horario_pegada: t.horario_pegada,
        $horario_fim: t.horario_fim,
        $horario_limite: t.horario_limite,
        $limite_horas: t.limite_horas || '11:20',
        $status_operacional: t.status_operacional,
        $status_jornada: t.status_jornada,
        $duracao_horas: t.duracao_horas,
        $valor_diaria: t.valor_diaria || 0,
        $status_diaria: t.status_diaria || 'Pendente',
        $observacoes_transferencia: t.observacoes_transferencia,
        $ultima_atualizacao: t.ultima_atualizacao
      });
    }
  })();
}

export function saveImportedDataWithMode(
  escalaId: string, 
  distribuicoes: ViagemDistribuicao[], 
  transferencias: ViagemTransferencia[], 
  modo: 'SOBRESCREVER' | 'APENAS_NOVAS' = 'SOBRESCREVER'
) {
  let distToSave = distribuicoes;
  let transfToSave = transferencias;

  if (modo === 'APENAS_NOVAS') {
    const rotasDistDb = new Set(
      db.query<{ rota: string }, [string]>('SELECT rota FROM viagem_distribuicao WHERE escala_id = ?')
        .all(escalaId).map(r => (r.rota || '').trim().toUpperCase()).filter(Boolean)
    );
    const transfDbKeys = new Set(
      db.query<{ operacao_rota: string; horario_pegada: string }, [string]>(
        'SELECT operacao_rota, horario_pegada FROM viagem_transferencia WHERE escala_id = ?'
      ).all(escalaId).map(t => `${(t.operacao_rota || '').trim().toUpperCase()}__${(t.horario_pegada || '').trim()}`)
    );

    distToSave = distribuicoes.filter(d => !rotasDistDb.has((d.rota || d.embarque_cod || '').trim().toUpperCase()));
    transfToSave = transferencias.filter(t => !transfDbKeys.has(`${(t.operacao_rota || '').trim().toUpperCase()}__${(t.horario_pegada || '').trim()}`));
  } else if (modo === 'SOBRESCREVER') {
    // Se sobrescrever, removemos as rotas conflitantes desta escala para que entrem limpas com os dados novos
    const rotasDistIncoming = distribuicoes.map(d => (d.rota || d.embarque_cod || '').trim().toUpperCase()).filter(Boolean);

    db.transaction(() => {
      for (const rota of rotasDistIncoming) {
        db.query('DELETE FROM viagem_distribuicao WHERE escala_id = ? AND UPPER(rota) = ?').run(escalaId, rota);
      }
      for (const t of transferencias) {
        const rota = (t.operacao_rota || '').trim().toUpperCase();
        const pegada = (t.horario_pegada || '').trim();
        if (rota) {
          if (pegada) {
            db.query('DELETE FROM viagem_transferencia WHERE escala_id = ? AND UPPER(operacao_rota) = ? AND horario_pegada = ?').run(escalaId, rota, pegada);
          } else {
            db.query('DELETE FROM viagem_transferencia WHERE escala_id = ? AND UPPER(operacao_rota) = ?').run(escalaId, rota);
          }
        }
      }
    })();
  }

  saveImportedData(escalaId, distToSave, transfToSave);

  return {
    imported: {
      distribuicoes: distToSave.length,
      transferencias: transfToSave.length
    },
    modo
  };
}

export function upsertDistribuicao(d: ViagemDistribuicao) {
  let retorno = d.retorno_previsto;
  if (!retorno && d.hora_ultima_loja) {
    retorno = calcularRetornoPrevisto(d.hora_ultima_loja, 4);
  }

  const { status: status1Loja } = avaliarConformidadePrimeiraLoja(
    d.horario_primeira_entrega,
    d.horario_real_primeira_loja || ''
  );

  let ordem = d.ordem ?? 0;
  if (!ordem) {
    const existing = db.query<{ ordem: number }, [string]>('SELECT ordem FROM viagem_distribuicao WHERE id = ?').get(d.id);
    if (existing && existing.ordem) {
      ordem = existing.ordem;
    }
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO viagem_distribuicao (
      id, escala_id, embarque_cod, rota, tipo_veiculo, doca, hora_encoste_previsto,
      hora_saida_motorista, horario_saida_real, justificativa_saida, qtd_lojas, lojas,
      volume_m3, qtd_caixas, primeira_entrega, horario_primeira_entrega, horario_real_primeira_loja,
      status_primeira_loja, hora_ultima_loja, retorno_previsto, pirometro, placa_cavalo,
      placa_carreta, vinculo_gobrax, motorista_nome, motorista_restrito, ajudante_1,
      ajudante_2, observacoes, data_saida_condutor, fornecedor_ajudante, valor_diaria, status_diaria, status_motorista, status_carregamento, ordem
    ) VALUES (
      $id, $escala_id, $embarque_cod, $rota, $tipo_veiculo, $doca, $hora_encoste_previsto,
      $hora_saida_motorista, $horario_saida_real, $justificativa_saida, $qtd_lojas, $lojas,
      $volume_m3, $qtd_caixas, $primeira_entrega, $horario_primeira_entrega, $horario_real_primeira_loja,
      $status_primeira_loja, $hora_ultima_loja, $retorno_previsto, $pirometro, $placa_cavalo,
      $placa_carreta, $vinculo_gobrax, $motorista_nome, $motorista_restrito, $ajudante_1,
      $ajudante_2, $observacoes, $data_saida_condutor, $fornecedor_ajudante, $valor_diaria, $status_diaria, $status_motorista, $status_carregamento, $ordem
    )
  `);

  stmt.run({
    $id: d.id,
    $escala_id: d.escala_id,
    $embarque_cod: d.embarque_cod || '',
    $rota: d.rota,
    $tipo_veiculo: d.tipo_veiculo,
    $doca: d.doca,
    $hora_encoste_previsto: d.hora_encoste_previsto,
    $hora_saida_motorista: d.hora_saida_motorista,
    $horario_saida_real: d.horario_saida_real || d.hora_saida_motorista || '',
    $justificativa_saida: d.justificativa_saida || '',
    $qtd_lojas: d.qtd_lojas,
    $lojas: d.lojas,
    $volume_m3: d.volume_m3,
    $qtd_caixas: d.qtd_caixas || 0,
    $primeira_entrega: d.primeira_entrega,
    $horario_primeira_entrega: d.horario_primeira_entrega,
    $horario_real_primeira_loja: d.horario_real_primeira_loja || '',
    $status_primeira_loja: d.status_primeira_loja || status1Loja,
    $hora_ultima_loja: d.hora_ultima_loja || '',
    $retorno_previsto: retorno || '',
    $pirometro: d.pirometro || '',
    $placa_cavalo: d.placa_cavalo,
    $placa_carreta: d.placa_carreta,
    $vinculo_gobrax: d.vinculo_gobrax || 'DESVINCULADO',
    $motorista_nome: d.motorista_nome,
    $motorista_restrito: d.motorista_restrito ? 1 : 0,
    $ajudante_1: d.ajudante_1,
    $ajudante_2: d.ajudante_2,
    $observacoes: d.observacoes,
    $data_saida_condutor: d.data_saida_condutor || '',
    $fornecedor_ajudante: d.fornecedor_ajudante || '',
    $valor_diaria: d.valor_diaria,
    $status_diaria: d.status_diaria,
    $status_motorista: d.status_motorista,
    $status_carregamento: d.status_carregamento,
    $ordem: ordem
  });
}

export function deleteDistribuicao(id: string) {
  db.query('DELETE FROM viagem_distribuicao WHERE id = ?').run(id);
}

export function upsertTransferencia(t: ViagemTransferencia) {
  let horarioFim = t.horario_fim || '';
  let statusOperacional = t.status_operacional || 'INICIANDO';

  // Se o usuário informou horário de fim e o status ainda estava INICIANDO ou AGUARDANDO,
  // avança automaticamente para FINALIZADO
  if (horarioFim && (statusOperacional === 'INICIANDO' || statusOperacional === 'AGUARDANDO LIBERACAO')) {
    statusOperacional = 'FINALIZADO';
  }

  const duracao = calcularDuracao(t.horario_pegada, horarioFim);
  const limiteHoras = t.limite_horas || '11:20';
  const horarioLimite = calcularHorarioLimite(t.horario_pegada, limiteHoras);
  const { status: statusJornada } = avaliarStatusJornada(t.horario_pegada, horarioFim, limiteHoras, undefined, statusOperacional);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO viagem_transferencia (
      id, escala_id, operacao_rota, motorista_nome, placa, placa_carreta, vinculo_gobrax, horario_pegada,
      horario_fim, horario_limite, limite_horas, status_operacional, status_jornada,
      duracao_horas, valor_diaria, status_diaria, observacoes_transferencia, ultima_atualizacao
    ) VALUES (
      $id, $escala_id, $operacao_rota, $motorista_nome, $placa, $placa_carreta, $vinculo_gobrax, $horario_pegada,
      $horario_fim, $horario_limite, $limite_horas, $status_operacional, $status_jornada,
      $duracao_horas, $valor_diaria, $status_diaria, $observacoes_transferencia, $ultima_atualizacao
    )
  `);

  stmt.run({
    $id: t.id,
    $escala_id: t.escala_id,
    $operacao_rota: t.operacao_rota,
    $motorista_nome: t.motorista_nome,
    $placa: t.placa,
    $placa_carreta: t.placa_carreta || '',
    $vinculo_gobrax: t.vinculo_gobrax || 'DESVINCULADO',
    $horario_pegada: t.horario_pegada,
    $horario_fim: horarioFim,
    $horario_limite: horarioLimite,
    $limite_horas: limiteHoras,
    $status_operacional: statusOperacional,
    $status_jornada: statusJornada,
    $duracao_horas: duracao,
    $valor_diaria: t.valor_diaria || 0,
    $status_diaria: t.status_diaria || 'Pendente',
    $observacoes_transferencia: t.observacoes_transferencia,
    $ultima_atualizacao: new Date().toISOString()
  });
}

export function deleteTransferencia(id: string) {
  db.query('DELETE FROM viagem_transferencia WHERE id = ?').run(id);
}

export function upsertPlantao(p: PlantaoReserva) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO plantao_reserva (
      id, escala_id, motorista_nome, horario_plantao, status_contato, observacoes
    ) VALUES (
      $id, $escala_id, $motorista_nome, $horario_plantao, $status_contato, $observacoes
    )
  `);
  stmt.run({
    $id: p.id,
    $escala_id: p.escala_id,
    $motorista_nome: p.motorista_nome,
    $horario_plantao: p.horario_plantao,
    $status_contato: p.status_contato,
    $observacoes: p.observacoes
  });
}

export function deletePlantao(id: string) {
  db.query('DELETE FROM plantao_reserva WHERE id = ?').run(id);
}

export function upsertPassagemTurno(item: PassagemTurnoItem) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO passagem_turno (
      id, escala_id, turno, item_num, descricao, observacao, status, criado_em
    ) VALUES (
      $id, $escala_id, $turno, $item_num, $descricao, $observacao, $status, $criado_em
    )
  `);
  stmt.run({
    $id: item.id,
    $escala_id: item.escala_id,
    $turno: item.turno,
    $item_num: item.item_num,
    $descricao: item.descricao,
    $observacao: item.observacao,
    $status: item.status,
    $criado_em: item.criado_em || new Date().toISOString()
  });
}

export function deletePassagemTurno(id: string) {
  db.query('DELETE FROM passagem_turno WHERE id = ?').run(id);
}

export function upsertTemperaturaCross(t: TemperaturaCrossItem) {
  const { foraDaFaixa } = avaliarTemperaturaCross(t.temperatura_congelado, t.temperatura_resfriado);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO temperatura_cross (
      id, escala_id, cavalo, carreta, temperatura_congelado, temperatura_resfriado,
      fora_da_faixa, observacoes, horario_afericao
    ) VALUES (
      $id, $escala_id, $cavalo, $carreta, $temperatura_congelado, $temperatura_resfriado,
      $fora_da_faixa, $observacoes, $horario_afericao
    )
  `);
  stmt.run({
    $id: t.id,
    $escala_id: t.escala_id,
    $cavalo: t.cavalo.toUpperCase(),
    $carreta: t.carreta.toUpperCase(),
    $temperatura_congelado: t.temperatura_congelado.toUpperCase(),
    $temperatura_resfriado: t.temperatura_resfriado.toUpperCase(),
    $fora_da_faixa: foraDaFaixa ? 1 : 0,
    $observacoes: t.observacoes || '',
    $horario_afericao: t.horario_afericao || '10:00'
  });
}

export function deleteTemperaturaCross(id: string) {
  db.query('DELETE FROM temperatura_cross WHERE id = ?').run(id);
}

export function upsertAjudante(a: AjudanteOperacao) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO escala_ajudantes (
      id, escala_id, nome_ajudante, prestador, rota, motorista_nome, data_inicio,
      horario_inicio, horario_chegada, horario_fim, obs
    ) VALUES (
      $id, $escala_id, $nome_ajudante, $prestador, $rota, $motorista_nome, $data_inicio,
      $horario_inicio, $horario_chegada, $horario_fim, $obs
    )
  `);
  stmt.run({
    $id: a.id,
    $escala_id: a.escala_id,
    $nome_ajudante: a.nome_ajudante.toUpperCase(),
    $prestador: a.prestador.toUpperCase(),
    $rota: a.rota.toUpperCase(),
    $motorista_nome: a.motorista_nome.toUpperCase(),
    $data_inicio: a.data_inicio || '',
    $horario_inicio: a.horario_inicio || '',
    $horario_chegada: a.horario_chegada || '',
    $horario_fim: a.horario_fim || '',
    $obs: a.obs || ''
  });
}

export function deleteAjudante(id: string) {
  db.query('DELETE FROM escala_ajudantes WHERE id = ?').run(id);
}

/**
 * Consulta agregada para filtro por período (Data Início / Fim)
 */
export function getEscalaPeriodo(inicio: string, fim: string): EscalaCompleta {
  const escalas = db.query<EscalaDia, [string, string]>(
    'SELECT * FROM escala_dia WHERE data_operacao BETWEEN ? AND ? ORDER BY data_operacao ASC'
  ).all(inicio, fim);

  const escala: EscalaDia = escalas[0] || {
    id: 'periodo',
    data_operacao: `${inicio} a ${fim}`,
    criado_em: new Date().toISOString(),
    atualizado_por: 'Período Consolidado'
  };

  const escalaIds = escalas.map(e => `'${e.id}'`).join(',');
  if (!escalaIds) {
    return { 
      escala,
      distribuicoes: [], 
      transferencias: [], 
      plantoes: [],
      passagens: [], 
      temperaturas: [], 
      ajudantes: [] 
    };
  }

  let distribuicoes = db.query<ViagemDistribuicao, []>(
    `SELECT * FROM viagem_distribuicao WHERE escala_id IN (${escalaIds}) ORDER BY hora_encoste_previsto ASC, ordem ASC, rowid ASC`
  ).all();

  distribuicoes = distribuicoes.map((d: ViagemDistribuicao) => {
    let ret = d.retorno_previsto;
    if (!ret && d.hora_ultima_loja) {
      ret = calcularRetornoPrevisto(d.hora_ultima_loja, 4);
    }
    const { status: status1Loja } = avaliarConformidadePrimeiraLoja(
      d.horario_primeira_entrega,
      d.horario_real_primeira_loja || ''
    );
    return {
      ...d,
      retorno_previsto: ret,
      status_primeira_loja: d.status_primeira_loja || status1Loja,
      vinculo_gobrax: d.vinculo_gobrax || 'DESVINCULADO',
      motorista_restrito: Boolean(d.motorista_restrito)
    };
  });

  let transferencias = db.query<ViagemTransferencia, []>(
    `SELECT * FROM viagem_transferencia WHERE escala_id IN (${escalaIds}) ORDER BY horario_pegada ASC`
  ).all();

  transferencias = transferencias.map((t: ViagemTransferencia) => {
    let horarioFim = t.horario_fim || '';
    let statusOperacional = t.status_operacional || 'INICIANDO';
    if (horarioFim && (statusOperacional === 'INICIANDO' || statusOperacional === 'AGUARDANDO LIBERACAO')) {
      statusOperacional = 'FINALIZADO';
    }
    const duracao = calcularDuracao(t.horario_pegada, horarioFim);
    const limiteHoras = t.limite_horas || '11:20';
    const horarioLimite = calcularHorarioLimite(t.horario_pegada, limiteHoras);
    const { status: statusJornada } = avaliarStatusJornada(t.horario_pegada, horarioFim, limiteHoras, undefined, statusOperacional);
    return {
      ...t,
      status_operacional: statusOperacional,
      limite_horas: limiteHoras,
      horario_limite: horarioLimite,
      duracao_horas: duracao,
      status_jornada: statusJornada,
      vinculo_gobrax: t.vinculo_gobrax || 'DESVINCULADO',
      status_diaria: t.status_diaria || 'Pendente',
      valor_diaria: t.valor_diaria || 0
    };
  });

  const plantoes = db.query<PlantaoReserva, []>(
    `SELECT * FROM plantao_reserva WHERE escala_id IN (${escalaIds}) ORDER BY horario_plantao ASC`
  ).all();

  const passagens = db.query<PassagemTurnoItem, []>(
    `SELECT * FROM passagem_turno WHERE escala_id IN (${escalaIds}) ORDER BY criado_em ASC`
  ).all();

  const temperaturasRaw = db.query<any, []>(
    `SELECT * FROM temperatura_cross WHERE escala_id IN (${escalaIds})`
  ).all();

  const temperaturas: TemperaturaCrossItem[] = temperaturasRaw.map((t: any) => {
    const { foraDaFaixa } = avaliarTemperaturaCross(t.temperatura_congelado, t.temperatura_resfriado);
    return {
      ...t,
      fora_da_faixa: foraDaFaixa
    };
  });

  const ajudantes = db.query<AjudanteOperacao, []>(
    `SELECT * FROM escala_ajudantes WHERE escala_id IN (${escalaIds})`
  ).all();

  return { 
    escala, 
    distribuicoes, 
    transferencias, 
    plantoes: plantoes || [],
    passagens: passagens || [], 
    temperaturas: temperaturas || [], 
    ajudantes: ajudantes || [] 
  };
}

/**
 * Gera um snapshot atômico do banco de dados SQLite para backup/download (database-optimizer)
 */
export function createDatabaseBackup(): { filename: string; buffer: Buffer } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `logistics_backup_${timestamp}.db`;
  const tempPath = path.join(dataDir, `_temp_${filename}`);

  try {
    // Utiliza VACUUM INTO para gerar uma cópia consistente sem locks prolongados
    db.exec(`VACUUM INTO '${tempPath}';`);
    const buffer = fs.readFileSync(tempPath);
    try { fs.unlinkSync(tempPath); } catch {}
    return { filename, buffer };
  } catch {
    // Fallback: cópia direta do arquivo logistics.db
    const sourceDb = path.join(dataDir, 'logistics.db');
    const buffer = fs.readFileSync(sourceDb);
    return { filename, buffer };
  }
}

/**
 * Inicializa os usuários padrão do sistema (TI e ADM) se a tabela de usuários estiver vazia
 */
export async function initAuthUsers() {
  try {
    const existing = db.query('SELECT COUNT(*) as count FROM usuarios').get() as { count: number };
    if (!existing || existing.count === 0) {
      console.log('Inicializando usuários padrão do sistema (TI e ADM)...');
      const tiHash = await Bun.password.hash('ti@controltower2026', { algorithm: 'bcrypt', cost: 10 });
      const admHash = await Bun.password.hash('adm@controltower2026', { algorithm: 'bcrypt', cost: 10 });

      db.query(`
        INSERT INTO usuarios (id, username, nome, senha_hash, perfil, ativo, criado_em)
        VALUES 
          (?, ?, ?, ?, ?, 1, datetime('now')),
          (?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(
        crypto.randomUUID(), 'ti', 'Administrador T.I', tiHash, 'TI',
        crypto.randomUUID(), 'adm', 'Operações ADM', admHash, 'ADM'
      );
      console.log('Usuários padrão inicializados: ti e adm');
    }
  } catch (err) {
    console.error('Erro ao inicializar usuários padrão:', err);
  }
}

// Inicializa usuários em background ao carregar módulo
initAuthUsers();

export async function autenticarUsuario(
  username: string, 
  senha: string
): Promise<{ success: boolean; user?: UsuarioLogado; token?: string; error?: string }> {
  if (!username || !senha) {
    return { success: false, error: 'Usuário e senha são obrigatórios' };
  }
  const cleanUsername = username.trim().toLowerCase();
  const row = db.query('SELECT * FROM usuarios WHERE LOWER(username) = ? AND ativo = 1').get(cleanUsername) as any;
  if (!row) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  const isMatch = await Bun.password.verify(senha, row.senha_hash);
  if (!isMatch) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  // Gera token de sessão seguro (UUID v4)
  const token = crypto.randomUUID();
  const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias
  const agora = new Date().toISOString();

  db.query(`
    INSERT INTO sessoes (token, usuario_id, expira_em, criado_em)
    VALUES (?, ?, ?, ?)
  `).run(token, row.id, expiraEm, agora);

  db.query('UPDATE usuarios SET ultimo_login = ? WHERE id = ?').run(agora, row.id);

  const user: UsuarioLogado = {
    id: row.id,
    username: row.username,
    nome: row.nome,
    perfil: row.perfil as PerfilUsuario,
    ativo: Boolean(row.ativo),
    criado_em: row.criado_em,
    ultimo_login: agora
  };

  return { success: true, user, token };
}

export function validarSessao(token: string): UsuarioLogado | null {
  if (!token) return null;
  const agora = new Date().toISOString();
  const row = db.query(`
    SELECT u.id, u.username, u.nome, u.perfil, u.ativo, u.criado_em, u.ultimo_login, s.expira_em
    FROM sessoes s
    JOIN usuarios u ON s.usuario_id = u.id
    WHERE s.token = ? AND s.expira_em > ? AND u.ativo = 1
  `).get(token, agora) as any;

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    nome: row.nome,
    perfil: row.perfil as PerfilUsuario,
    ativo: Boolean(row.ativo),
    criado_em: row.criado_em,
    ultimo_login: row.ultimo_login
  };
}

export function encerrarSessao(token: string): boolean {
  if (!token) return false;
  db.query('DELETE FROM sessoes WHERE token = ?').run(token);
  return true;
}

export function listarUsuarios(): UsuarioLogado[] {
  const rows = db.query('SELECT id, username, nome, perfil, ativo, criado_em, ultimo_login FROM usuarios ORDER BY username').all() as any[];
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    nome: r.nome,
    perfil: r.perfil as PerfilUsuario,
    ativo: Boolean(r.ativo),
    criado_em: r.criado_em,
    ultimo_login: r.ultimo_login
  }));
}

export async function criarUsuario(data: {
  username: string;
  nome: string;
  senha: string;
  perfil: PerfilUsuario;
}): Promise<{ success: boolean; user?: UsuarioLogado; error?: string }> {
  const username = data.username.trim().toLowerCase();
  if (!username || !data.senha || !data.nome) {
    return { success: false, error: 'Nome, usuário e senha são obrigatórios' };
  }
  const existing = db.query('SELECT id FROM usuarios WHERE LOWER(username) = ?').get(username);
  if (existing) {
    return { success: false, error: 'Este nome de usuário já está em uso' };
  }

  const hash = await Bun.password.hash(data.senha, { algorithm: 'bcrypt', cost: 10 });
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();

  db.query(`
    INSERT INTO usuarios (id, username, nome, senha_hash, perfil, ativo, criado_em)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(id, username, data.nome.trim(), hash, data.perfil, agora);

  return {
    success: true,
    user: {
      id,
      username,
      nome: data.nome.trim(),
      perfil: data.perfil,
      ativo: true,
      criado_em: agora
    }
  };
}

export async function alterarSenha(usuarioId: string, novaSenha: string): Promise<{ success: boolean; error?: string }> {
  if (!novaSenha || novaSenha.length < 4) {
    return { success: false, error: 'A senha deve ter no mínimo 4 caracteres' };
  }
  const hash = await Bun.password.hash(novaSenha, { algorithm: 'bcrypt', cost: 10 });
  db.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hash, usuarioId);
  return { success: true };
}

export { db };

