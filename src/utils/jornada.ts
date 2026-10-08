import { StatusJornada } from '../types';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60).toString().padStart(2, '0');
  const m = (norm % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function calcularHorarioLimite(horarioPegada: string, limiteHoras: string = '11:20'): string {
  if (!horarioPegada || !horarioPegada.includes(':')) return '';
  const pegadaMin = timeToMinutes(horarioPegada);
  const limiteMin = timeToMinutes(limiteHoras);
  return minutesToTime(pegadaMin + limiteMin);
}

/**
 * Fórmula solicitada pelo operador: Retorno Previsto = Última Loja + 04:00
 */
export function calcularRetornoPrevisto(horaUltimaLoja: string, horasAdicionais: number = 4): string {
  if (!horaUltimaLoja || !horaUltimaLoja.includes(':')) return '';
  const min = timeToMinutes(horaUltimaLoja);
  return minutesToTime(min + horasAdicionais * 60);
}

export function calcularDuracao(horarioInicio: string, horarioFim: string): string {
  if (!horarioInicio || !horarioFim) return '';
  let start = timeToMinutes(horarioInicio);
  let end = timeToMinutes(horarioFim);
  if (end < start) {
    end += 1440;
  }
  const diff = end - start;
  const h = Math.floor(diff / 60).toString().padStart(2, '0');
  const m = (diff % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Solicitação de JC (Página 1 do PDF):
 * Comparação entre Horário Previsto da 1ª Loja e Horário Real de Chegada.
 * Retorna OK ou ATRASO com a minutagem de atraso.
 */
export function avaliarConformidadePrimeiraLoja(
  horarioPrevisto: string,
  horarioReal: string
): { status: 'OK' | 'ATRASO' | 'PENDENTE'; atrasoMin: number; label: string } {
  if (!horarioReal || !horarioReal.trim() || !horarioReal.includes(':')) {
    return { status: 'PENDENTE', atrasoMin: 0, label: 'Pendente' };
  }
  if (!horarioPrevisto || !horarioPrevisto.trim() || !horarioPrevisto.includes(':')) {
    return { status: 'OK', atrasoMin: 0, label: 'OK' };
  }

  const prevMin = timeToMinutes(horarioPrevisto);
  let realMin = timeToMinutes(horarioReal);

  // Se cruzou a meia-noite (ex: previsto 23:30 e real 00:15)
  if (realMin < prevMin && prevMin - realMin > 720) {
    realMin += 1440;
  }

  if (realMin <= prevMin) {
    return { status: 'OK', atrasoMin: 0, label: 'OK' };
  } else {
    const diff = realMin - prevMin;
    return { status: 'ATRASO', atrasoMin: diff, label: `Atraso (+${diff}m)` };
  }
}

/**
 * Retorna a hora atual no fuso horário oficial de Brasília (America/Sao_Paulo).
 * Garante exatidão mesmo quando o servidor hospedeiro roda em UTC (AWS Lightsail, Docker, etc.).
 */
export function getBrasiliaTimeStr(): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
  } catch {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Retorna os minutos do horário de encoste ajustado para o ciclo operacional do CD.
 * O ciclo logístico de distribuição inicia por volta das 10h/11h da manhã e estende-se
 * pela tarde, noite e cruza a madrugada até a manhã seguinte (09:59).
 * Horários de 00:00 a 09:59 são somados de 24h (+1440 min) para figurarem
 * na sequência cronológica natural após os carregamentos da tarde e noite.
 */
export function getEncosteOperationalMinutes(timeStr?: string, cutoffHour: number = 10): number {
  if (!timeStr || !timeStr.includes(':')) return 99999;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (isNaN(h)) return 99999;
  const adjustedHour = h < cutoffHour ? h + 24 : h;
  return adjustedHour * 60 + m;
}

export function avaliarStatusJornada(
  horarioPegada: string,
  horarioFim: string = '',
  limiteHoras: string = '11:20',
  arg4?: string,
  arg5?: string
): { status: StatusJornada; minutosRestantes: number } {
  if (!horarioPegada || !horarioPegada.includes(':')) {
    return { status: 'SEM ESTOURO', minutosRestantes: 999 };
  }

  // Desambiguação inteligente de parâmetros:
  // Se o 4º argumento tem ":" é currentTimeStr, se não tem é statusOperacional
  let currentTimeStr: string | undefined = undefined;
  let statusOperacional: string | undefined = undefined;

  if (arg4) {
    if (arg4.includes(':')) {
      currentTimeStr = arg4;
      statusOperacional = arg5;
    } else {
      statusOperacional = arg4;
      if (arg5 && arg5.includes(':')) {
        currentTimeStr = arg5;
      }
    }
  } else if (arg5) {
    statusOperacional = arg5;
  }

  const duracaoLimiteMin = timeToMinutes(limiteHoras);

  // Viagens que ainda estão iniciando ou aguardando liberação nunca computam estouro
  if (statusOperacional === 'INICIANDO' || statusOperacional === 'AGUARDANDO LIBERACAO') {
    return { status: 'SEM ESTOURO', minutosRestantes: duracaoLimiteMin };
  }

  const pegadaMin = timeToMinutes(horarioPegada);
  let tempoDecorridoMin = 0;

  if (horarioFim && horarioFim.includes(':')) {
    let fimMin = timeToMinutes(horarioFim);
    if (fimMin < pegadaMin) {
      // Se cruzou a meia-noite (ex: pegada 22:00 e fim 04:00 -> 6 horas)
      // Porém, se a diferença calculada for maior que 16 horas (ex: pegada 14:00 e fim 11:30 residual -> 21h30),
      // trata-se de um fim antigo residual de viagem anterior que não condiz com a nova pegada.
      const diffCross = (fimMin + 1440) - pegadaMin;
      if (diffCross > 960) {
        // Horário de fim residual/inválido: desconsiderar estouro
        tempoDecorridoMin = 0;
      } else {
        tempoDecorridoMin = diffCross;
      }
    } else {
      tempoDecorridoMin = fimMin - pegadaMin;
    }
  } else {
    let currentMin: number;
    if (currentTimeStr && currentTimeStr.includes(':')) {
      currentMin = timeToMinutes(currentTimeStr);
    } else {
      // Obter horário atual no fuso de Brasília (America/Sao_Paulo) de forma segura em qualquer servidor
      currentMin = timeToMinutes(getBrasiliaTimeStr());
    }

    if (currentMin >= pegadaMin) {
      tempoDecorridoMin = currentMin - pegadaMin;
    } else {
      // A hora atual é menor que a hora de pegada.
      // Caso 1: Viagem agendada para mais tarde hoje (ex: agora 14:00 e pegada 20:00).
      // Caso 2: Viagem iniciada ontem à noite que cruzou a madrugada (ex: pegada 22:00 e agora 04:00).
      // Somente computar overnight se o horário atual for na madrugada/manhã (<= 10:00),
      // a pegada tiver ocorrido à noite (>= 18:00) e o status for em trânsito.
      const isEmTransito = statusOperacional && (
        statusOperacional === 'EM TRANSITO' || 
        statusOperacional.includes('SENTIDO') || 
        statusOperacional === 'CARREGANDO' || 
        statusOperacional === 'EM DESCARGA' || 
        statusOperacional === 'CHEGOU NO LOCAL'
      );

      const isMadrugadaManha = currentMin <= 600; // até 10:00
      const isPegadaNoite = pegadaMin >= 1080;    // a partir das 18:00
      const diffOvernight = (currentMin + 1440) - pegadaMin;

      if (isEmTransito && isMadrugadaManha && isPegadaNoite && diffOvernight <= duracaoLimiteMin + 120) {
        tempoDecorridoMin = diffOvernight;
      } else {
        tempoDecorridoMin = 0;
      }
    }
  }

  const minutosRestantes = duracaoLimiteMin - tempoDecorridoMin;

  if (minutosRestantes < 0) {
    return { status: 'ESTOURADO', minutosRestantes };
  } else if (minutosRestantes <= 60) {
    return { status: 'ALERTA 1H', minutosRestantes };
  }
  return { status: 'SEM ESTOURO', minutosRestantes };
}

/**
 * Validação de temperatura do Cross CD-JD:
 * - Congelado deve estar <= -18°C (alerta se > -15°C)
 * - Resfriado deve estar entre 0°C e +4°C (alerta se > +4°C)
 */
export function avaliarTemperaturaCross(congStr: string, resfStr: string): { foraDaFaixa: boolean; motivo: string } {
  const c = congStr.trim().toUpperCase();
  const r = resfStr.trim().toUpperCase();

  let fora = false;
  const motivos: string[] = [];

  if (c !== 'SECO' && c !== '') {
    const num = parseFloat(c.replace(',', '.'));
    if (!isNaN(num) && num > -15) {
      fora = true;
      motivos.push(`Congelado alto (${c}°C > -15°C)`);
    }
  }

  if (r !== 'SECO' && r !== '') {
    const num = parseFloat(r.replace(',', '.'));
    if (!isNaN(num) && num > 4) {
      fora = true;
      motivos.push(`Resfriado alto (${r}°C > 4°C)`);
    }
  }

  return {
    foraDaFaixa: fora,
    motivo: motivos.join(', ')
  };
}

export function isLinhaTransferencia(rota: string, embarque: string = ''): boolean {
  const text = `${rota || ''} ${embarque || ''}`.toUpperCase();
  const keywords = [
    'CDJC', 'CDFT', 'CELLIER', 'KERRY', 'DOHLER', 'PANIFRESH',
    'BOM SABOR', 'CROSS', 'TRJD', 'COLETA', 'TRANSFERENCIA', 'TRANSF', 'ENTREGA CELLIER'
  ];
  return keywords.some(k => text.includes(k));
}

/**
 * Base pré-cadastrada de placas para lista suspensa (combobox autocomplete)
 * Solicitado na Página 3 do PDF para eliminar erros de digitação de placas.
 */
export const BASE_PLACAS_CONHECIDAS = [
  'FYR6A78', 'FAQ4G29', 'GKD3A99', 'GHL9G62', 'EGJ8729', 'FSI8417', 
  'EKH7433', 'CPV9A01', 'EGJ7769', 'BXZ4D12', 'CUD8B30', 'DSW1E55',
  'EQA9C88', 'FRG2A44', 'GBN5F77', 'GHR8H23', 'FXT3A19', 'FTY4B65',
  'GCV1C88', 'GDT9E44', 'GEF6A22', 'GFH3B99', 'GGJ7C11', 'GHK5D33',
  'GHM8E77', 'GHN2F88', 'GHP4G99', 'EXCEDENTE'
];

export const BASE_PRESTADORES_AJUDANTES = [
  'AJUDANTE LED',
  'AJUDANTE RHELP'
];
