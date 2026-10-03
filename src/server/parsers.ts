import * as XLSX from 'xlsx';
import { isLinhaTransferencia, calcularHorarioLimite, avaliarStatusJornada, calcularRetornoPrevisto } from '../utils/jornada';
import { ViagemDistribuicao, ViagemTransferencia } from '../types';

export function parseXlsxBuffer(buffer: ArrayBuffer | Buffer, escalaId: string) {
  const workbook = XLSX.read(buffer, { 
    type: 'buffer', 
    sheets: 0, 
    cellFormula: false, 
    cellHTML: false, 
    dense: true 
  });
  
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const rowStr = rows[i].map(c => String(c).toUpperCase()).join('|');
    if (rowStr.includes('EMBARQUE') || (rowStr.includes('ROTA') && rowStr.includes('DOCA'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headers = rows[headerRowIndex].map(h => String(h).trim().toUpperCase());
  
  const getCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name.toUpperCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colEmbarque = getCol('EMBARQUE');
  const colTipoVeiculo = getCol('TIPO DE VEÍCULO', 'TIPO VEICULO', 'VEICULO');
  const colRota = getCol('ROTA');
  const colDoca = getCol('DOCA');
  const colHoraEncoste = getCol('HORA ENCOSTE', 'ENCOSTE');
  const colLojas = getCol('LOJAS', 'LOJA');
  const colM3 = getCol('M3', 'VOLUME');
  const colPlaca = getCol('PLACA');
  const colPlacaCarreta = getCol('PLACA CARRETA', 'CARRETA');
  const colMotorista = getCol('MOTORISTA', 'CONDUTOR');
  const colAjudante1 = getCol('AJUDANTE 1');
  const colAjudante2 = getCol('AJUDANTE 2');
  const colObs = getCol('OBSERVAÇÕES', 'OBSERVACOES', 'OBS');
  const colHoraSaida = getCol('HORÁRIO SAIDA', 'HORARIO SAIDA', 'SAIDA MOTORISTA');
  const colAtrasoJustificativa = getCol('ATRASO JUSTIFICATIVA', 'JUSTIFICATIVA');
  const col1Entrega = getCol('1° ENTREGA', '1ª ENTREGA', 'PRIMEIRA ENTREGA');
  const colHora1Entrega = getCol('HORÁRIO 1° ENTREGA', 'HORARIO 1 ENTREGA', 'HORARIO PRIMEIRA');
  const colHoraUltimaLoja = getCol('HOR ULTIMA LOJA', 'ULTIMA LOJA', 'HORA ULTIMA');
  const colRetornoPrevisto = getCol('RETORNO PREVISTO', 'RETORNO');
  const colStatusMotorista = getCol('STATUS MOTORISTA');
  const colDiaria = getCol('DIARIA EFETIVA', 'DIARIA');
  const colStatusDiaria = getCol('STATUS DIÁRIA', 'STATUS DIARIA');

  const distribuicoes: ViagemDistribuicao[] = [];
  const transferencias: ViagemTransferencia[] = [];
  let blankCount = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row.some(c => String(c).trim().length > 0)) {
      blankCount++;
      if (blankCount >= 10) break;
      continue;
    }
    blankCount = 0;

    const embarque = colEmbarque >= 0 ? String(row[colEmbarque] || '').trim() : '';
    const rota = colRota >= 0 ? String(row[colRota] || '').trim() : '';
    const motorista = colMotorista >= 0 ? String(row[colMotorista] || '').trim() : '';
    const placa = colPlaca >= 0 ? String(row[colPlaca] || '').trim() : '';
    
    if (!embarque && !rota && !motorista && !placa) continue;
    if (embarque === 'EMBARQUE' || rota === 'ROTA') continue;

    const horaEncoste = colHoraEncoste >= 0 ? formatTime(row[colHoraEncoste]) : '';
    const lojas = colLojas >= 0 ? String(row[colLojas] || '').trim() : '';
    const obs = colObs >= 0 ? String(row[colObs] || '').trim() : '';
    const primeiraEntrega = col1Entrega >= 0 ? String(row[col1Entrega] || '').trim() : (lojas ? lojas.split(/[-–;,]/)[0].trim() : '');
    const hora1Entrega = colHora1Entrega >= 0 ? formatTime(row[colHora1Entrega]) : '';
    const horaUltima = colHoraUltimaLoja >= 0 ? formatTime(row[colHoraUltimaLoja]) : '';
    
    // Cálculo da fórmula do retorno previsto (+4 horas após última loja)
    let retornoPrev = colRetornoPrevisto >= 0 ? formatTime(row[colRetornoPrevisto]) : '';
    if (!retornoPrev && horaUltima) {
      retornoPrev = calcularRetornoPrevisto(horaUltima, 4);
    }

    if (isLinhaTransferencia(rota, embarque)) {
      const operacao = rota || embarque || 'TRANSFERÊNCIA';
      const pegada = horaEncoste || '06:00';
      const limite = calcularHorarioLimite(pegada, '11:20');
      const { status: statusJornada } = avaliarStatusJornada(pegada, '', '11:20');

      transferencias.push({
        id: crypto.randomUUID(),
        escala_id: escalaId,
        operacao_rota: operacao,
        motorista_nome: motorista,
        placa: placa,
        horario_pegada: pegada,
        horario_fim: '',
        horario_limite: limite,
        limite_horas: '11:20',
        status_operacional: 'INICIANDO',
        status_jornada: statusJornada,
        duracao_horas: '',
        observacoes_transferencia: obs,
        ultima_atualizacao: new Date().toISOString()
      });
    } else {
      distribuicoes.push({
        id: crypto.randomUUID(),
        escala_id: escalaId,
        embarque_cod: '',
        rota: rota,
        tipo_veiculo: colTipoVeiculo >= 0 ? String(row[colTipoVeiculo] || '').trim() : '',
        doca: colDoca >= 0 ? String(row[colDoca] || '').trim() : '',
        hora_encoste_previsto: horaEncoste,
        hora_saida_motorista: colHoraSaida >= 0 ? formatTime(row[colHoraSaida]) : '',
        justificativa_saida: colAtrasoJustificativa >= 0 ? String(row[colAtrasoJustificativa] || '').trim() : '',
        qtd_lojas: lojas ? lojas.split(/[-–;,]/).length : 1,
        lojas: lojas || primeiraEntrega,
        volume_m3: colM3 >= 0 ? Number(row[colM3]) || 0 : 0,
        primeira_entrega: primeiraEntrega,
        horario_primeira_entrega: hora1Entrega,
        hora_ultima_loja: horaUltima,
        retorno_previsto: retornoPrev,
        placa_cavalo: placa,
        placa_carreta: colPlacaCarreta >= 0 ? String(row[colPlacaCarreta] || '').trim() : '',
        motorista_nome: motorista,
        ajudante_1: colAjudante1 >= 0 ? String(row[colAjudante1] || '').trim() : '',
        ajudante_2: colAjudante2 >= 0 ? String(row[colAjudante2] || '').trim() : '',
        observacoes: obs,
        valor_diaria: colDiaria >= 0 ? Number(row[colDiaria]) || 0 : 0,
        status_diaria: colStatusDiaria >= 0 ? String(row[colStatusDiaria] || 'Pendente').trim() : 'Pendente',
        status_motorista: colStatusMotorista >= 0 ? String(row[colStatusMotorista] || 'OK').trim() : 'OK',
        status_carregamento: 'Pendente'
      });
    }
  }

  return { distribuicoes, transferencias };
}

export function parseRawText(text: string, escalaId: string) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const rows = lines.map(line => line.split(/\t|;/));
  
  const distribuicoes: ViagemDistribuicao[] = [];
  const transferencias: ViagemTransferencia[] = [];

  for (const row of rows) {
    if (row.length < 2) continue;
    const rota = (row[0] || '').trim();
    const placa = (row[1] || '').trim();
    const motorista = (row[2] || '').trim();
    const hora = formatTime(row[3] || '');
    const lojas = (row[4] || '').trim();
    const doca = (row[5] || '').trim();

    if (isLinhaTransferencia(rota)) {
      const pegada = hora || '06:00';
      transferencias.push({
        id: crypto.randomUUID(),
        escala_id: escalaId,
        operacao_rota: rota,
        motorista_nome: motorista,
        placa: placa,
        horario_pegada: pegada,
        horario_fim: '',
        horario_limite: calcularHorarioLimite(pegada, '11:20'),
        limite_horas: '11:20',
        status_operacional: 'INICIANDO',
        status_jornada: 'SEM ESTOURO',
        duracao_horas: '',
        observacoes_transferencia: '',
        ultima_atualizacao: new Date().toISOString()
      });
    } else {
      distribuicoes.push({
        id: crypto.randomUUID(),
        escala_id: escalaId,
        embarque_cod: '',
        rota: rota,
        tipo_veiculo: 'TRUCK',
        doca: doca,
        hora_encoste_previsto: hora,
        hora_saida_motorista: '',
        justificativa_saida: '',
        qtd_lojas: lojas ? lojas.split(/[-–;,]/).length : 1,
        lojas: lojas,
        volume_m3: 0,
        primeira_entrega: lojas.split(/[-–;,]/)[0]?.trim() || '',
        horario_primeira_entrega: '',
        hora_ultima_loja: '',
        retorno_previsto: '',
        placa_cavalo: placa,
        placa_carreta: '',
        motorista_nome: motorista,
        ajudante_1: '',
        ajudante_2: '',
        observacoes: '',
        valor_diaria: 0,
        status_diaria: 'Pendente',
        status_motorista: 'OK',
        status_carregamento: 'Pendente'
      });
    }
  }

  return { distribuicoes, transferencias };
}

export async function parsePdfBuffer(buffer: Buffer, escalaId: string) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    const text = data.text || '';
    
    const isEmbarqueDefinitivo = text.includes('Embarque') || text.includes('KMs:') || text.includes('FOODTOWN') || text.includes('RFG COMERCIO');
    const distribuicoes: ViagemDistribuicao[] = [];
    const transferencias: ViagemTransferencia[] = [];

    if (isEmbarqueDefinitivo) {
      // Separar por blocos de rota usando as linhas horizontais de demarcação do relatório
      const blocks = text.split(/[\uFFFD\u2500-\u257F\-=]{10,}/);

      for (let i = 1; i < blocks.length; i++) {
        const b = blocks[i].trim();
        if (!b) continue;

        // Código da rota (ex: ON611M, SP605M, CP673M, NO691M, SO696M, LT665M, etc.)
        const rotaMatch = b.match(/\b([A-Z]{2,4}[0-9]{2,5}[A-Z]?)/);
        if (!rotaMatch) continue;
        const rota = rotaMatch[1].toUpperCase();

        const kmMatch = b.match(/([0-9.,]+)\s*KMs:/i);
        const km = kmMatch ? kmMatch[1] : '';

        const crossMatch = b.match(/Cross\s*Docking:\s*([A-Z0-9_-]+)/i);
        const cross = crossMatch ? crossMatch[1].trim().toUpperCase() : '';

        const carMatch = b.match(/Carregamento:\s*(?:Sab|Dom|Seg|Ter|Qua|Qui|Sex|2\.F|3\.F|4\.F|5\.F|6\.F)?\s*([0-2]?[0-9]:[0-5][0-9])/i);
        const horaCarregamento = carMatch ? carMatch[1] : '';

        let tipoVeiculo = 'TRUCK';
        const vMatch = b.match(/MBR-([A-Z0-9/]+)-[A-Z0-9]+/i);
        if (vMatch) {
          const code = vMatch[1].toUpperCase();
          if (code === 'TRU') tipoVeiculo = 'TRUCK';
          else if (code === 'TOC') tipoVeiculo = 'TOCO';
          else if (code === 'VUC') tipoVeiculo = 'VUC';
          else if (code === 'CAR') tipoVeiculo = 'CARRETA';
          else if (code === '3/4') tipoVeiculo = '3/4';
          else if (code === 'VLE') tipoVeiculo = 'VAN';
          else tipoVeiculo = code;
        }

        // Extração de lojas atendidas na rota
        // Formato na linha: [cxs][SIGLA_LOJA][DIA] [HORARIO][m3,kg...][SENTIDO]
        const delRegex = /^([0-9]+)?([A-Z0-9]{3})(?:Sab|Dom|Seg|Ter|Qua|Qui|Sex|2\.F|3\.F|4\.F|5\.F|6\.F)?\s*([0-2]?[0-9]:[0-5][0-9])([0-9]+,[0-9]).*?(DIR|ESQ|AMB|\*\*\*)$/gm;
        let delMatch;
        const entregas: { cxs: number; loja: string; horario: string; m3: number; sentido: string }[] = [];
        while ((delMatch = delRegex.exec(b)) !== null) {
          const loja = delMatch[2].toUpperCase();
          if (['ENT', 'RET', 'DOM', 'SAB', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'KMS', 'PAG'].includes(loja)) continue;
          entregas.push({
            cxs: parseInt(delMatch[1] || '0', 10),
            loja,
            horario: delMatch[3],
            m3: parseFloat((delMatch[4] || '0').replace(',', '.')),
            sentido: delMatch[5]
          });
        }

        const sumCxs = entregas.reduce((acc, e) => acc + e.cxs, 0);
        const sumM3 = Math.round(entregas.reduce((acc, e) => acc + e.m3, 0) * 10) / 10;

        const primeiraLoja = entregas[0]?.loja || '';
        const hora1Loja = entregas[0]?.horario || '';
        const ultimaLoja = entregas[entregas.length - 1]?.loja || '';
        const horaUltimaLoja = entregas[entregas.length - 1]?.horario || '';
        const retornoPrevisto = horaUltimaLoja ? calcularRetornoPrevisto(horaUltimaLoja, 4) : '';
        const lojasStr = entregas.map(e => `${e.loja}${e.sentido ? ` (${e.sentido})` : ''}`).join(' -> ');

        const obsParts: string[] = [];
        if (km) obsParts.push(`KM: ${km}`);
        if (cross) obsParts.push(`Cross: ${cross}`);
        const obsFinal = obsParts.join(' | ');

        distribuicoes.push({
          id: crypto.randomUUID(),
          escala_id: escalaId,
          embarque_cod: '',
          rota: rota,
          tipo_veiculo: tipoVeiculo,
          doca: '',
          hora_encoste_previsto: horaCarregamento,
          hora_saida_motorista: '',
          horario_saida_real: '',
          justificativa_saida: '',
          qtd_lojas: entregas.length,
          lojas: lojasStr,
          volume_m3: sumM3,
          qtd_caixas: sumCxs,
          primeira_entrega: primeiraLoja,
          horario_primeira_entrega: hora1Loja,
          horario_real_primeira_loja: '',
          status_primeira_loja: 'PENDENTE',
          hora_ultima_loja: horaUltimaLoja,
          retorno_previsto: retornoPrevisto,
          pirometro: '',
          placa_cavalo: '',
          placa_carreta: '',
          vinculo_gobrax: 'DESVINCULADO',
          motorista_nome: '',
          motorista_restrito: false,
          ajudante_1: '',
          ajudante_2: '',
          observacoes: obsFinal,
          valor_diaria: 0,
          status_diaria: 'Pendente',
          status_motorista: 'OK',
          status_carregamento: 'Pendente'
        });

        // Rotas com Cross-Docking de Jundiaí (TRJD...) geram acompanhamento de transferência
        if (cross && (cross.startsWith('TRJD') || isLinhaTransferencia(rota, cross))) {
          transferencias.push({
            id: crypto.randomUUID(),
            escala_id: escalaId,
            operacao_rota: `${cross} (${rota})`,
            motorista_nome: '',
            placa: '',
            vinculo_gobrax: 'DESVINCULADO',
            horario_pegada: horaCarregamento || '06:00',
            horario_fim: '',
            horario_limite: calcularHorarioLimite(horaCarregamento || '06:00', '11:20'),
            limite_horas: '11:20',
            status_operacional: 'INICIANDO',
            status_jornada: 'SEM ESTOURO',
            duracao_horas: '',
            valor_diaria: 0,
            status_diaria: 'Pendente',
            observacoes_transferencia: `Transferência CD-JD | ${rota} | Lojas: ${lojasStr}`,
            ultima_atualizacao: new Date().toISOString()
          });
        }
      }

      return { distribuicoes, transferencias };
    }

    // Fallback: parser genérico linha a linha para relatórios simples
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    const regexPlaca = /[A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-[0-9]{4}/;
    const regexHora = /(?:[01]?[0-9]|2[0-3]):[0-5][0-9]/;
    const regexDoca = /DOCA\s*([0-9A-Z]+)/i;
    const regexRotaPadrao = /^[A-Z]{2,4}[0-9]{2,5}[A-Z]?$/i;
    const IGNORE_WORDS = new Set([
      'PÁGINA', 'PAG', 'EMISSÃO', 'RELATÓRIO', 'TOTAL', 'ROTAS', 'CXS', 'DIARIA', 
      'MOTORISTA', 'PLACA', 'HORARIO', 'DATA', 'CLIENTE', 'FATURAMENTO', 'SECOS', 
      'CONGELADOS', 'RESFRIADOS', 'CUBAGEM', 'VOLUME', 'MELHORIA', 'ESQUEMA', 
      'SOLICITAÇÃO', 'FILTRAR', 'VALIDAR', 'INSERIR', 'HORA', 'EMBARQUE', 'CARGA',
      'VINCULO', 'GOBRAX', 'PIROMETRO', 'POSSIBILIDADE', 'ALTERAÇÕES', 'ALTERACOES',
      'OBSERVAÇÕES', 'OBSERVACOES', 'ESCALA', 'STATUS', 'AJUDANTE', 'DESVINCULADO'
    ]);

    for (const line of lines) {
      const upperLine = line.toUpperCase();
      if (
        upperLine.includes('PÁGINA') || 
        upperLine.includes('EMISSÃO') || 
        upperLine.includes('RELATÓRIO') || 
        line.length < 4
      ) continue;

      const placaMatch = line.match(regexPlaca);
      const horaMatch = line.match(regexHora);
      const docaMatch = line.match(regexDoca);

      const placa = placaMatch ? placaMatch[0] : '';
      const hora = horaMatch ? horaMatch[0] : '';
      const doca = docaMatch ? docaMatch[1] : '';

      const tokens = line.split(/\s+/);
      const rawToken = (tokens[0] || '').replace(/[^A-Za-z0-9_-]/g, '').trim().toUpperCase();

      if (!rawToken || IGNORE_WORDS.has(rawToken) || /^[0-9]+[.,][0-9]+$/.test(tokens[0])) {
        continue;
      }

      if (isLinhaTransferencia(line)) {
        transferencias.push({
          id: crypto.randomUUID(),
          escala_id: escalaId,
          operacao_rota: rawToken || 'TRANSFERÊNCIA',
          motorista_nome: tokens.slice(1, 3).join(' '),
          placa: placa,
          horario_pegada: hora || '06:00',
          horario_fim: '',
          horario_limite: calcularHorarioLimite(hora || '06:00', '11:20'),
          limite_horas: '11:20',
          status_operacional: 'INICIANDO',
          status_jornada: 'SEM ESTOURO',
          duracao_horas: '',
          valor_diaria: 0,
          status_diaria: 'Pendente',
          observacoes_transferencia: line,
          ultima_atualizacao: new Date().toISOString()
        });
      } else if (regexRotaPadrao.test(rawToken)) {
        distribuicoes.push({
          id: crypto.randomUUID(),
          escala_id: escalaId,
          embarque_cod: '',
          rota: rawToken,
          tipo_veiculo: 'TRUCK',
          doca: doca,
          hora_encoste_previsto: hora,
          hora_saida_motorista: '',
          horario_saida_real: '',
          justificativa_saida: '',
          qtd_lojas: 1,
          lojas: '',
          volume_m3: 0,
          qtd_caixas: 0,
          primeira_entrega: '',
          horario_primeira_entrega: '',
          horario_real_primeira_loja: '',
          status_primeira_loja: 'PENDENTE',
          hora_ultima_loja: '',
          retorno_previsto: '',
          pirometro: '',
          placa_cavalo: placa,
          placa_carreta: '',
          vinculo_gobrax: 'DESVINCULADO',
          motorista_nome: '',
          motorista_restrito: false,
          ajudante_1: '',
          ajudante_2: '',
          observacoes: '',
          valor_diaria: 0,
          status_diaria: 'Pendente',
          status_motorista: 'OK',
          status_carregamento: 'Pendente'
        });
      }
    }

    return { distribuicoes, transferencias };
  } catch (err) {
    console.error('Erro ao processar PDF:', err);
    return { distribuicoes: [], transferencias: [] };
  }
}

function formatTime(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    if (val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const m = (totalMinutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    }
  }
  const s = String(val).trim();
  const match = s.match(/(?:[01]?[0-9]|2[0-3]):[0-5][0-9]/);
  return match ? match[0] : s;
}

export function parseStructuredAiJson(rawInput: any, escalaId: string) {
  let dataObj: any = rawInput;
  if (typeof rawInput === 'string') {
    let clean = rawInput.trim();
    // Remover blocos de markdown ```json ... ``` se o usuário colou com formatação
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    dataObj = JSON.parse(clean);
  }

  const cabecalho = dataObj?.cabecalho || {};
  const rotas = Array.isArray(dataObj?.rotas) ? dataObj.rotas : [];
  const duplicadas_detectadas_no_pdf = Array.isArray(dataObj?.duplicadas_detectadas_no_pdf) 
    ? dataObj.duplicadas_detectadas_no_pdf.map((r: any) => String(r).trim().toUpperCase())
    : [];

  const distribuicoes: ViagemDistribuicao[] = [];
  const transferencias: ViagemTransferencia[] = [];

  for (const r of rotas) {
    const codRota = String(r.codigo_rota || '').trim();
    if (!codRota) continue;

    const cross = r.cross_docking ? String(r.cross_docking).trim() : '';
    const isTransf = isLinhaTransferencia(codRota, cross);

    const entregas = Array.isArray(r.entregas) ? [...r.entregas] : [];
    entregas.sort((a, b) => (Number(a.sequencia) || 0) - (Number(b.sequencia) || 0));

    const primeiraEntrega = entregas[0]?.codigo_loja ? String(entregas[0].codigo_loja).trim() : '';
    const hora1Entrega = entregas[0]?.previsao_entrega ? formatTime(entregas[0].previsao_entrega) : '';
    const ultimaEntrega = entregas[entregas.length - 1];
    const horaUltima = ultimaEntrega?.previsao_entrega ? formatTime(ultimaEntrega.previsao_entrega) : '';
    
    let retornoPrev = '';
    if (horaUltima) {
      retornoPrev = calcularRetornoPrevisto(horaUltima, 4);
    }

    const lojasStr = entregas
      .map(e => `${e.codigo_loja}${e.sentido ? ` (${e.sentido})` : ''}`)
      .join(' -> ');

    const totais = r.totais || {};
    const volTotal = Number(totais.volume_total) || 0;
    const m3 = Number(r.cubagem_m3_total) || 0;
    const km = Number(r.km_total) || 0;

    const obsParts: string[] = [];
    if (km > 0) obsParts.push(`KM: ${km}`);
    if (r.transportadora) obsParts.push(`Transp: ${r.transportadora}`);
    if (cross) obsParts.push(`Cross: ${cross}`);
    if (totais.congelado || totais.resfriado || totais.seco) {
      obsParts.push(`Cong: ${totais.congelado || 0} | Resf: ${totais.resfriado || 0} | Seco: ${totais.seco || 0}`);
    }
    const obsFinal = obsParts.join(' | ');

    if (isTransf) {
      const pegada = formatTime(r.horario_carregamento) || '06:00';
      transferencias.push({
        id: crypto.randomUUID(),
        escala_id: escalaId,
        operacao_rota: codRota,
        motorista_nome: r.transportadora || '',
        placa: '',
        vinculo_gobrax: 'DESVINCULADO',
        horario_pegada: pegada,
        horario_fim: '',
        horario_limite: calcularHorarioLimite(pegada, '11:20'),
        limite_horas: '11:20',
        status_operacional: 'INICIANDO',
        status_jornada: 'SEM ESTOURO',
        duracao_horas: '',
        valor_diaria: 0,
        status_diaria: 'Pendente',
        observacoes_transferencia: obsFinal,
        ultima_atualizacao: new Date().toISOString()
      });
    } else {
      distribuicoes.push({
        id: crypto.randomUUID(),
        escala_id: escalaId,
        embarque_cod: '',
        rota: codRota,
        tipo_veiculo: r.tipo_veiculo ? String(r.tipo_veiculo).trim().toUpperCase() : 'TRUCK',
        doca: '',
        hora_encoste_previsto: formatTime(r.horario_carregamento),
        hora_saida_motorista: '',
        horario_saida_real: '',
        justificativa_saida: '',
        qtd_lojas: entregas.length > 0 ? entregas.length : 1,
        lojas: lojasStr || primeiraEntrega,
        volume_m3: m3,
        qtd_caixas: volTotal,
        primeira_entrega: primeiraEntrega,
        horario_primeira_entrega: hora1Entrega,
        horario_real_primeira_loja: '',
        status_primeira_loja: 'PENDENTE',
        hora_ultima_loja: horaUltima,
        retorno_previsto: retornoPrev,
        pirometro: '',
        placa_cavalo: '',
        placa_carreta: '',
        vinculo_gobrax: 'DESVINCULADO',
        motorista_nome: '',
        motorista_restrito: false,
        ajudante_1: '',
        ajudante_2: '',
        observacoes: obsFinal,
        valor_diaria: 0,
        status_diaria: 'Pendente',
        status_motorista: 'OK',
        status_carregamento: 'Pendente'
      });
    }
  }

  return {
    cabecalho,
    distribuicoes,
    transferencias,
    duplicadas_detectadas_no_pdf
  };
}

