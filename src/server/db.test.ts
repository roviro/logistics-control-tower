import { describe, expect, it } from 'bun:test';
import { checkDuplicidades, saveImportedData, getEscalaCompleta, getOrCreateEscala } from './db';
import { ViagemDistribuicao, ViagemTransferencia } from '../types';

describe('Ordem dos PDFs e Reutilização de Rotas de Transferência', () => {
  it('deve permitir reutilizar rotas de transferência com o mesmo nome em horários de pegada diferentes sem acusar conflito', () => {
    const escala = getOrCreateEscala('2099-12-30');
    const escalaId = escala.id;

    const transfExisting: ViagemTransferencia[] = [
      {
        id: 't-1',
        escala_id: escalaId,
        operacao_rota: 'CDJC X CDFT',
        motorista_nome: 'JOAO',
        placa: 'ABC1234',
        horario_pegada: '06:00',
        horario_fim: '11:00',
        horario_limite: '17:20',
        limite_horas: '11:20',
        status_operacional: 'FINALIZADO',
        status_jornada: 'SEM ESTOURO',
        duracao_horas: '05:00',
        valor_diaria: 0,
        status_diaria: 'Pendente',
        observacoes_transferencia: '',
        ultima_atualizacao: new Date().toISOString()
      }
    ];

    saveImportedData(escalaId, [], transfExisting);

    // Nova viagem com a mesma rota CDJC X CDFT, mas pegada às 14:00 (próximo turno)
    const transfNova: ViagemTransferencia[] = [
      {
        id: 't-2',
        escala_id: escalaId,
        operacao_rota: 'CDJC X CDFT',
        motorista_nome: 'PEDRO',
        placa: 'XYZ9876',
        horario_pegada: '14:00',
        horario_fim: '',
        horario_limite: '01:20',
        limite_horas: '11:20',
        status_operacional: 'INICIANDO',
        status_jornada: 'SEM ESTOURO',
        duracao_horas: '',
        valor_diaria: 0,
        status_diaria: 'Pendente',
        observacoes_transferencia: '',
        ultima_atualizacao: new Date().toISOString()
      }
    ];

    const dup = checkDuplicidades(escalaId, [], transfNova);
    // Não deve acusar como conflito, pois a pegada é diferente (reutilização de rota operacional)
    expect(dup.hasDuplicates).toBe(false);
    expect(dup.novas_rotas.length).toBe(1);
  });

  it('deve ordenar as rotas de distribuição rigorosamente pelo horário de encoste e pela ordem sequencial do PDF', () => {
    const escala = getOrCreateEscala('2099-12-31');
    const escalaId = escala.id;

    // Simula 2 rotas às 15:00 vindas de dois PDFs distintos:
    // Rota A do PDF 1 (ordem 1), Rota B do PDF 2 (ordem 3)
    // E rotas às 16:00: Rota C do PDF 1 (ordem 2), Rota D do PDF 2 (ordem 4)
    const rotas: ViagemDistribuicao[] = [
      {
        id: 'dist-c',
        escala_id: escalaId,
        embarque_cod: '',
        rota: 'ROTA_C_16H',
        tipo_veiculo: 'TRUCK',
        doca: '50',
        hora_encoste_previsto: '16:00',
        hora_saida_motorista: '',
        horario_saida_real: '',
        justificativa_saida: '',
        qtd_lojas: 1,
        lojas: 'LOJA 1',
        volume_m3: 10,
        qtd_caixas: 100,
        primeira_entrega: 'LOJA 1',
        horario_primeira_entrega: '',
        horario_real_primeira_loja: '',
        status_primeira_loja: 'OK',
        hora_ultima_loja: '',
        retorno_previsto: '',
        pirometro: '',
        placa_cavalo: '',
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
        status_carregamento: 'Pendente',
        ordem: 2 // PDF 1 (segunda rota no pdf 1)
      },
      {
        id: 'dist-a',
        escala_id: escalaId,
        embarque_cod: '',
        rota: 'ROTA_A_15H',
        tipo_veiculo: 'TRUCK',
        doca: '90', // doca alta proposital para testar que doca não passa na frente da ordem
        hora_encoste_previsto: '15:00',
        hora_saida_motorista: '',
        horario_saida_real: '',
        justificativa_saida: '',
        qtd_lojas: 1,
        lojas: 'LOJA 1',
        volume_m3: 10,
        qtd_caixas: 100,
        primeira_entrega: 'LOJA 1',
        horario_primeira_entrega: '',
        horario_real_primeira_loja: '',
        status_primeira_loja: 'OK',
        hora_ultima_loja: '',
        retorno_previsto: '',
        pirometro: '',
        placa_cavalo: '',
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
        status_carregamento: 'Pendente',
        ordem: 1 // PDF 1 (primeira rota no pdf 1)
      },
      {
        id: 'dist-b',
        escala_id: escalaId,
        embarque_cod: '',
        rota: 'ROTA_B_15H',
        tipo_veiculo: 'TRUCK',
        doca: '01', // doca 01 propositalmente baixa
        hora_encoste_previsto: '15:00',
        hora_saida_motorista: '',
        horario_saida_real: '',
        justificativa_saida: '',
        qtd_lojas: 1,
        lojas: 'LOJA 1',
        volume_m3: 10,
        qtd_caixas: 100,
        primeira_entrega: 'LOJA 1',
        horario_primeira_entrega: '',
        horario_real_primeira_loja: '',
        status_primeira_loja: 'OK',
        hora_ultima_loja: '',
        retorno_previsto: '',
        pirometro: '',
        placa_cavalo: '',
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
        status_carregamento: 'Pendente',
        ordem: 3 // PDF 2 (primeira rota no pdf 2)
      },
      {
        id: 'dist-d',
        escala_id: escalaId,
        embarque_cod: '',
        rota: 'ROTA_D_16H',
        tipo_veiculo: 'TRUCK',
        doca: '02',
        hora_encoste_previsto: '16:00',
        hora_saida_motorista: '',
        horario_saida_real: '',
        justificativa_saida: '',
        qtd_lojas: 1,
        lojas: 'LOJA 1',
        volume_m3: 10,
        qtd_caixas: 100,
        primeira_entrega: 'LOJA 1',
        horario_primeira_entrega: '',
        horario_real_primeira_loja: '',
        status_primeira_loja: 'OK',
        hora_ultima_loja: '',
        retorno_previsto: '',
        pirometro: '',
        placa_cavalo: '',
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
        status_carregamento: 'Pendente',
        ordem: 4 // PDF 2 (segunda rota no pdf 2)
      }
    ];

    saveImportedData(escalaId, rotas, []);
    const { distribuicoes } = getEscalaCompleta('2099-12-31');
    const res = distribuicoes.filter(d => d.escala_id === escalaId);
    
    // A ordem esperada:
    // 15:00 -> ROTA_A_15H (ordem 1 do PDF 1) depois ROTA_B_15H (ordem 3 do PDF 2)
    // 16:00 -> ROTA_C_16H (ordem 2 do PDF 1) depois ROTA_D_16H (ordem 4 do PDF 2)
    const rotasOrd = res.map(r => r.rota);
    expect(rotasOrd).toEqual(['ROTA_A_15H', 'ROTA_B_15H', 'ROTA_C_16H', 'ROTA_D_16H']);
  });

  it('deve ordenar o ciclo completo de carregamento (11h da manhã -> 23h noite -> 01h madrugada -> 06h manhã seguinte)', () => {
    const escala = getOrCreateEscala('2099-11-30');
    const escalaId = escala.id;

    const baseRota = (id: string, rota: string, hora: string, ordem: number): ViagemDistribuicao => ({
      id,
      escala_id: escalaId,
      embarque_cod: '',
      rota,
      tipo_veiculo: 'TRUCK',
      doca: '10',
      hora_encoste_previsto: hora,
      hora_saida_motorista: '',
      horario_saida_real: '',
      justificativa_saida: '',
      qtd_lojas: 1,
      lojas: 'LOJA 1',
      volume_m3: 10,
      qtd_caixas: 100,
      primeira_entrega: 'LOJA 1',
      horario_primeira_entrega: '',
      horario_real_primeira_loja: '',
      status_primeira_loja: 'OK',
      hora_ultima_loja: '',
      retorno_previsto: '',
      pirometro: '',
      placa_cavalo: '',
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
      status_carregamento: 'Pendente',
      ordem
    });

    const rotas: ViagemDistribuicao[] = [
      baseRota('m1', 'ROTA_MADRUGADA_01H', '01:00', 3),
      baseRota('m2', 'ROTA_MADRUGADA_06H', '06:00', 4),
      baseRota('d1', 'ROTA_DIA_11H', '11:00', 1),
      baseRota('n1', 'ROTA_NOITE_23H', '23:00', 2)
    ];

    saveImportedData(escalaId, rotas, []);
    const { distribuicoes } = getEscalaCompleta('2099-11-30');
    const res = distribuicoes.filter(d => d.escala_id === escalaId);
    const ordemFinal = res.map(r => r.rota);

    expect(ordemFinal).toEqual([
      'ROTA_DIA_11H',
      'ROTA_NOITE_23H',
      'ROTA_MADRUGADA_01H',
      'ROTA_MADRUGADA_06H'
    ]);
  });
});
