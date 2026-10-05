export interface EscalaDia {
  id: string;
  data_operacao: string; // YYYY-MM-DD
  criado_em: string;
  atualizado_por: string;
}

export interface ViagemDistribuicao {
  id: string;
  escala_id: string;
  embarque_cod: string;
  rota: string;
  tipo_veiculo: string;
  doca: string;
  hora_encoste_previsto: string;
  hora_saida_motorista: string;
  horario_saida_real: string; // Horário de saída real
  justificativa_saida: string; // Saída com atraso (justificativa)
  qtd_lojas: number;
  lojas: string; // Todas as lojas da rota ex: "VOT - SOR"
  volume_m3: number;
  qtd_caixas: number; // Preenchimento de caixas (gestão)
  primeira_entrega: string; // Sigla da primeira loja
  horario_primeira_entrega: string; // Horário previsto 1ª loja
  horario_real_primeira_loja: string; // Horário real de chegada 1ª loja (Solicitação JC)
  status_primeira_loja: string; // 'OK' | 'ATRASO' | 'PENDENTE'
  hora_ultima_loja: string; // Horário da última loja
  retorno_previsto: string; // Última loja + 04:00 (fórmula)
  pirometro: string; // Temperatura de saída aferida no pirômetro (ex: -18°C, 2°C)
  placa_cavalo: string;
  placa_carreta: string;
  vinculo_gobrax: 'VINCULADO' | 'DESVINCULADO'; // Vínculo rastreador Gobrax
  motorista_nome: string;
  motorista_restrito: boolean; // Flag condutor restrito (obrigatoriedade de ajudante)
  ajudante_1: string;
  ajudante_2: string;
  observacoes: string;
  data_saida_condutor?: string; // Data de saída do condutor (YYYY-MM-DD)
  fornecedor_ajudante?: string; // 'LED' | 'RHELP' | 'PRÓPRIO' | 'SEM AJUDANTE'
  valor_diaria: number;
  status_diaria: string; // 'Pendente' | 'Pago'
  status_motorista: string;
  status_carregamento: string;
}

export type StatusOperacionalTransferencia = 
  | 'INICIANDO'
  | 'EM TRANSITO'
  | 'SENTIDO CDJC'
  | 'SENTIDO CDFT'
  | 'CHEGOU NO LOCAL'
  | 'CARREGANDO'
  | 'EM DESCARGA'
  | 'FINALIZADO'
  | 'AGUARDANDO LIBERACAO';

export type StatusJornada = 'SEM ESTOURO' | 'ALERTA 1H' | 'ESTOURADO';

export interface ViagemTransferencia {
  id: string;
  escala_id: string;
  operacao_rota: string;
  motorista_nome: string;
  placa: string;
  placa_carreta?: string; // Placa da carreta (duas placas para transferência)
  vinculo_gobrax: 'VINCULADO' | 'DESVINCULADO'; // Vínculo Gobrax na transferência
  horario_pegada: string; // HH:mm
  horario_fim: string;    // HH:mm
  horario_limite: string; // HH:mm
  limite_horas: string;   // '11:20' ou '08:20'
  status_operacional: StatusOperacionalTransferencia;
  status_jornada: StatusJornada;
  duracao_horas: string;
  valor_diaria: number;   // Diária na transferência
  status_diaria: string;  // 'Pendente' | 'Pago'
  observacoes_transferencia: string;
  ultima_atualizacao: string;
}

export interface PlantaoReserva {
  id: string;
  escala_id: string;
  motorista_nome: string;
  horario_plantao: string;
  status_contato: string;
  observacoes: string;
}

export interface PassagemTurnoItem {
  id: string;
  escala_id: string;
  turno: 'T1' | 'T2' | 'T3';
  item_num: number;
  descricao: string;
  observacao: string; // 'ACOMPANHAR' | 'INFORMATIVO' | 'FINALIZADO' | 'EM ANDAMENTO'
  status: 'REALIZADO' | 'NÃO REALIZADO';
  criado_em: string;
}

export interface TemperaturaCrossItem {
  id: string;
  escala_id: string;
  cavalo: string;
  carreta: string;
  temperatura_congelado: string; // ex: "-20", "-18", "SECO"
  temperatura_resfriado: string; // ex: "2", "3", "1", "SECO"
  fora_da_faixa: boolean;        // true se necessita chamar técnico
  observacoes: string;
  horario_afericao: string;
}

export interface AjudanteOperacao {
  id: string;
  escala_id: string;
  nome_ajudante: string;
  prestador: 'AJUDANTE LED' | 'AJUDANTE RHELP' | string;
  rota: string;
  motorista_nome: string;
  data_inicio: string;
  horario_inicio: string;
  horario_chegada: string;
  horario_fim: string;
  obs: string; // 'FINALIZADO' | 'AUSÊNCIA' | 'HORÁRIO RETORNO DO RCS' | 'AJUDANTE NÃO SE APRESENTOU NO RETORNO' | string
}

export interface EscalaCompleta {
  escala: EscalaDia;
  distribuicoes: ViagemDistribuicao[];
  transferencias: ViagemTransferencia[];
  plantoes: PlantaoReserva[];
  passagens: PassagemTurnoItem[];
  temperaturas: TemperaturaCrossItem[];
  ajudantes: AjudanteOperacao[];
}

export type PerfilUsuario = 'TI' | 'ADM';

export interface UsuarioLogado {
  id: string;
  username: string;
  nome: string;
  perfil: PerfilUsuario;
  ativo?: boolean;
  criado_em?: string;
  ultimo_login?: string;
}

declare module 'pdf-parse';

