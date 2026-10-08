import { describe, expect, it } from 'bun:test';
import { avaliarStatusJornada, getEncosteOperationalMinutes, getBrasiliaTimeStr } from './jornada';

describe('Jornada e Transferências - Testes de Regra de Negócio', () => {
  it('deve retornar hora atual de Brasília em formato HH:MM', () => {
    const brt = getBrasiliaTimeStr();
    expect(brt).toMatch(/^[0-2][0-9]:[0-5][0-9]$/);
  });

  it('deve ordenar o ciclo operacional de encoste do CD (11:00 -> 23:59 -> 00:00 -> 09:59)', () => {
    const rawTimes = [
      '01:00', '02:00', '04:00', '06:00', '09:00', 
      '11:00', '13:00', '15:00', '19:00', '23:00', '00:00', '00:01'
    ];

    const sorted = [...rawTimes].sort(
      (a, b) => getEncosteOperationalMinutes(a) - getEncosteOperationalMinutes(b)
    );

    expect(sorted).toEqual([
      '11:00', '13:00', '15:00', '19:00', '23:00', '00:00', '00:01',
      '01:00', '02:00', '04:00', '06:00', '09:00'
    ]);
  });

  it('não deve estourar se a viagem está com status INICIANDO', () => {
    // 4 argumentos com status operacional na 4ª posição (como o frontend chama)
    const res1 = avaliarStatusJornada('06:00', '', '11:20', 'INICIANDO');
    expect(res1.status).toBe('SEM ESTOURO');

    // 5 argumentos
    const res2 = avaliarStatusJornada('06:00', '', '11:20', undefined, 'INICIANDO');
    expect(res2.status).toBe('SEM ESTOURO');
  });

  it('não deve estourar quando a pegada é agendada para mais tarde hoje (ex: agora 14:00 e pegada 20:00)', () => {
    const res = avaliarStatusJornada('20:00', '', '11:20', '14:00', 'EM TRANSITO');
    expect(res.status).toBe('SEM ESTOURO');
    expect(res.minutosRestantes).toBe(680); // 11h20 completas
  });

  it('deve acusar ESTOURADO quando uma viagem durou 14h (ex: pegada 13:00 e fim 03:00 com limite 11:20)', () => {
    // Usuário informou pegada 13:00 e fim 03:00 (14 horas de viagem decorridas)
    const res = avaliarStatusJornada('13:00', '03:00', '11:20', 'INICIANDO');
    expect(res.status).toBe('ESTOURADO');
    expect(res.minutosRestantes).toBe(-160); // 680 - 840 = -160 min
  });

  it('deve calcular corretamente viagem concluída dentro do prazo (ex: pegada 06:00 e fim 14:00)', () => {
    const res = avaliarStatusJornada('06:00', '14:00', '11:20', 'FINALIZADO');
    expect(res.status).toBe('SEM ESTOURO');
    expect(res.minutosRestantes).toBe(200);
  });

  it('deve acusar ALERTA 1H quando a viagem estiver a menos de 60 min do limite', () => {
    // Pegada 06:00 e fim 17:00 (11h00 de duração, limite 11h20 -> restam 20 min)
    const res = avaliarStatusJornada('06:00', '17:00', '11:20', 'FINALIZADO');
    expect(res.status).toBe('ALERTA 1H');
    expect(res.minutosRestantes).toBe(20);
  });

  it('não deve estourar quando a rota é reutilizada com nova pegada (fim limpo e status INICIANDO)', () => {
    // Pegada alterada para 14:00 e fim devidamente limpo
    const res = avaliarStatusJornada('14:00', '', '11:20', 'INICIANDO');
    expect(res.status).toBe('SEM ESTOURO');
    expect(res.minutosRestantes).toBe(680);
  });

  it('deve calcular corretamente viagem noturna legítima em trânsito', () => {
    // Pegada 22:00, agora 04:00 (6 horas decorridas)
    const res = avaliarStatusJornada('22:00', '', '11:20', '04:00', 'EM TRANSITO');
    expect(res.status).toBe('SEM ESTOURO');
    expect(res.minutosRestantes).toBe(680 - 360); // 320 min restantes
  });

  it('deve acusar ESTOURADO legitimamente quando ultrapassar o limite de horas em trânsito', () => {
    // Pegada 06:00, agora 18:30 (12h30 decorridas = 750 min > 680 min)
    const res = avaliarStatusJornada('06:00', '', '11:20', '18:30', 'EM TRANSITO');
    expect(res.status).toBe('ESTOURADO');
    expect(res.minutosRestantes).toBeLessThan(0);
  });
});
