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

export function avaliarStatusJornada(
  horarioPegada: string,
  horarioFim: string = '',
  limiteHoras: string = '11:20',
  currentTimeStr?: string,
  statusOperacional?: string
): { status: StatusJornada; minutosRestantes: number } {
  if (!horarioPegada || !horarioPegada.includes(':')) {
    return { status: 'SEM ESTOURO', minutosRestantes: 999 };
  }

  const duracaoLimiteMin = timeToMinutes(limiteHoras);

  // Viagens que ainda estão iniciando ou aguardando liberação não devem computar estouro
  if (statusOperacional === 'INICIANDO' || statusOperacional === 'AGUARDANDO LIBERACAO') {
    return { status: 'SEM ESTOURO', minutosRestantes: duracaoLimiteMin };
  }

  const pegadaMin = timeToMinutes(horarioPegada);
  let tempoDecorridoMin = 0;

  if (horarioFim && horarioFim.includes(':')) {
    let fimMin = timeToMinutes(horarioFim);
    if (fimMin < pegadaMin) fimMin += 1440;
    tempoDecorridoMin = fimMin - pegadaMin;
  } else {
    let currentMin: number;
    if (currentTimeStr && currentTimeStr.includes(':')) {
      currentMin = timeToMinutes(currentTimeStr);
    } else {
      const now = new Date();
      currentMin = now.getHours() * 60 + now.getMinutes();
    }

    if (currentMin >= pegadaMin) {
      tempoDecorridoMin = currentMin - pegadaMin;
    } else {
      // Se a hora atual é menor que a hora de pegada:
      // Ex: pegada 20:00 (1200) e now 02:00 (120) da madrugada seguinte -> decorrido = (120 + 1440) - 1200 = 360m (6h)
      // Ex: pegada 20:00 (1200) e now 14:00 (840) da tarde -> a viagem é no futuro hoje! Faltam 6h para iniciar -> decorrido = 0
      const diffOvernight = (currentMin + 1440) - pegadaMin;
      if (diffOvernight > 960) {
        // Mais de 16h de diferença significa que o horário está agendado para mais tarde no dia
        tempoDecorridoMin = 0;
      } else {
        tempoDecorridoMin = diffOvernight;
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
