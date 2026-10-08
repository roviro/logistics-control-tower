import { describe, expect, it } from 'bun:test';
import { avaliarStatusJornada } from './jornada';

describe('Jornada e Transferências - Testes de Regra de Negócio', () => {
  it('não deve estourar se a viagem está com status INICIANDO', () => {
    // 4 argumentos com status operacional na 4ª posição (como o frontend chama)
    const res1 = avaliarStatusJornada('06:00', '', '11:20', 'INICIANDO');
    expect(res1.status).toBe('SEM ESTOURO');

    // 5 argumentos
    const res2 = avaliarStatusJornada('06:00', '', '11:20', undefined, 'INICIANDO');
    expect(res2.status).toBe('SEM ESTOURO');
  });

  it('não deve estourar quando a pegada é agendada para mais tarde hoje (ex: agora 08:00 e pegada 20:00)', () => {
    // Agora 08:00, pegada 20:00
    const res = avaliarStatusJornada('20:00', '', '11:20', '08:00');
    expect(res.status).toBe('SEM ESTOURO');
    expect(res.minutosRestantes).toBe(680); // 11h20 completas
  });

  it('não deve estourar quando a rota é reutilizada e tinha fim antigo residual', () => {
    // Pegada alterada para 14:00, mas tinha fim residual 11:30 de viagem matutina
    const res = avaliarStatusJornada('14:00', '11:30', '11:20', 'INICIANDO');
    expect(res.status).toBe('SEM ESTOURO');
  });

  it('deve calcular corretamente viagem noturna legítima em trânsito', () => {
    // Pegada 22:00, agora 04:00 (6 horas decorridas)
    const res = avaliarStatusJornada('22:00', '', '11:20', '04:00', 'EM TRANSITO');
    expect(res.status).toBe('SEM ESTOURO');
    expect(res.minutosRestantes).toBe(680 - 360); // 320 min restantes
  });

  it('deve acusar ESTOURADO legitimamente quando ultrapassar o limite de horas', () => {
    // Pegada 06:00, agora 18:30 (12h30 decorridas = 750 min > 680 min)
    const res = avaliarStatusJornada('06:00', '', '11:20', '18:30', 'EM TRANSITO');
    expect(res.status).toBe('ESTOURADO');
    expect(res.minutosRestantes).toBeLessThan(0);
  });
});
