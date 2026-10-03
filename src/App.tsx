import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TransferenciasTab } from './components/TransferenciasTab';
import { DistribuicaoTab } from './components/DistribuicaoTab';
import { PatioViewTab } from './components/PatioViewTab';
import { PlantoesTab } from './components/PlantoesTab';
import { PassagemTurnoTab } from './components/PassagemTurnoTab';
import { TemperaturaCrossTab } from './components/TemperaturaCrossTab';
import { DashboardTab } from './components/DashboardTab';
import { AjudantesTab } from './components/AjudantesTab';
import { ImportModal } from './components/ImportModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { LoginScreen } from './components/LoginScreen';
import { 
  EscalaCompleta, 
  ViagemDistribuicao, 
  ViagemTransferencia, 
  PlantaoReserva, 
  PassagemTurnoItem, 
  TemperaturaCrossItem,
  AjudanteOperacao,
  UsuarioLogado
} from './types';

export function App() {
  // Autenticação e Perfis (T.I e ADM)
  const [currentUser, setCurrentUser] = useState<UsuarioLogado | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ct_token');
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Inicializa com 2026-09-30 (data com dados reais da planilha importada) ou hoje
  const [dataOperacao, setDataOperacao] = useState('2026-09-30');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [dataInicio, setDataInicio] = useState('2026-09-28');
  const [dataFim, setDataFim] = useState('2026-10-02');
  const [escalaCompleta, setEscalaCompleta] = useState<EscalaCompleta | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [distribuicaoFilter, setDistribuicaoFilter] = useState<'TODOS' | 'SEM_EMBARQUE' | 'ATRASO_1LOJA' | 'RESTRITOS' | 'GOBRAX_PENDENTE'>('TODOS');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [clientsCount, setClientsCount] = useState(1);

  // Validação da Sessão Ativa
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('ct_token');
      if (!savedToken) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setCurrentUser(data.user);
          setToken(savedToken);
        } else {
          localStorage.removeItem('ct_token');
          setToken(null);
          setCurrentUser(null);
        }
      } catch {
        setAuthLoading(false);
        return;
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: UsuarioLogado, userToken: string) => {
    setCurrentUser(user);
    setToken(userToken);
    try {
      localStorage.setItem('ct_token', userToken);
    } catch {}
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
    }
    try {
      localStorage.removeItem('ct_token');
    } catch {}
    setToken(null);
    setCurrentUser(null);
  };

  const handleNavigateTab = (tab: string, filter?: string) => {
    if (tab === 'distribuicao' && filter) {
      setDistribuicaoFilter(filter as any);
    }
    setActiveTab(tab);
  };

  // Carregar dados da API (Dia Único)
  const fetchEscala = useCallback(async (data: string) => {
    try {
      const res = await fetch(`/api/escalas?data=${data}`);
      if (res.ok) {
        const json = await res.json();
        setEscalaCompleta(json);
      }
    } catch (err) {
      console.error('Erro ao buscar escala:', err);
    }
  }, []);

  // Carregar dados da API (Período)
  const fetchPeriodo = useCallback(async (inicio: string, fim: string) => {
    try {
      const res = await fetch(`/api/escalas/periodo?inicio=${inicio}&fim=${fim}`);
      if (res.ok) {
        const json = await res.json();
        setEscalaCompleta(json);
      }
    } catch (err) {
      console.error('Erro ao buscar escala por período:', err);
    }
  }, []);

  useEffect(() => {
    if (dateMode === 'single') {
      fetchEscala(dataOperacao);
    } else {
      fetchPeriodo(dataInicio, dataFim);
    }
  }, [dataOperacao, dateMode, fetchEscala, fetchPeriodo]);

  const handleApplyPeriodo = () => {
    fetchPeriodo(dataInicio, dataFim);
  };

  // Conexão WebSocket para colaboração multi-operador em tempo real
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket;
    let reconnectTimeout: any;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        const heartbeatInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'CLIENTS_COUNT') {
              setClientsCount(msg.data.count);
            } else if (msg.event === 'ESCALA_RELOAD') {
              fetchEscala(dataOperacao);
            } else if (msg.event === 'DISTRIBUICAO_UPDATED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                const exists = prev.distribuicoes.some(d => d.id === msg.data.id);
                return {
                  ...prev,
                  distribuicoes: exists
                    ? prev.distribuicoes.map(d => d.id === msg.data.id ? msg.data : d)
                    : [msg.data, ...prev.distribuicoes]
                };
              });
            } else if (msg.event === 'DISTRIBUICAO_DELETED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  distribuicoes: prev.distribuicoes.filter(d => d.id !== msg.data.id)
                };
              });
            } else if (msg.event === 'TRANSFERENCIA_UPDATED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                const exists = prev.transferencias.some(t => t.id === msg.data.id);
                return {
                  ...prev,
                  transferencias: exists
                    ? prev.transferencias.map(t => t.id === msg.data.id ? msg.data : t)
                    : [msg.data, ...prev.transferencias]
                };
              });
            } else if (msg.event === 'TRANSFERENCIA_DELETED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  transferencias: prev.transferencias.filter(t => t.id !== msg.data.id)
                };
              });
            } else if (msg.event === 'PLANTAO_UPDATED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                const exists = prev.plantoes.some(p => p.id === msg.data.id);
                return {
                  ...prev,
                  plantoes: exists
                    ? prev.plantoes.map(p => p.id === msg.data.id ? msg.data : p)
                    : [msg.data, ...prev.plantoes]
                };
              });
            } else if (msg.event === 'PLANTAO_DELETED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  plantoes: prev.plantoes.filter(p => p.id !== msg.data.id)
                };
              });
            } else if (msg.event === 'PASSAGEM_UPDATED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                const exists = prev.passagens?.some(p => p.id === msg.data.id);
                return {
                  ...prev,
                  passagens: exists
                    ? prev.passagens.map(p => p.id === msg.data.id ? msg.data : p)
                    : [...(prev.passagens || []), msg.data]
                };
              });
            } else if (msg.event === 'PASSAGEM_DELETED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  passagens: (prev.passagens || []).filter(p => p.id !== msg.data.id)
                };
              });
            } else if (msg.event === 'TEMPERATURA_UPDATED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                const exists = prev.temperaturas?.some(t => t.id === msg.data.id);
                return {
                  ...prev,
                  temperaturas: exists
                    ? prev.temperaturas.map(t => t.id === msg.data.id ? msg.data : t)
                    : [...(prev.temperaturas || []), msg.data]
                };
              });
            } else if (msg.event === 'TEMPERATURA_DELETED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  temperaturas: (prev.temperaturas || []).filter(t => t.id !== msg.data.id)
                };
              });
            } else if (msg.event === 'AJUDANTE_UPDATED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                const exists = prev.ajudantes?.some(a => a.id === msg.data.id);
                return {
                  ...prev,
                  ajudantes: exists
                    ? prev.ajudantes.map(a => a.id === msg.data.id ? msg.data : a)
                    : [...(prev.ajudantes || []), msg.data]
                };
              });
            } else if (msg.event === 'AJUDANTE_DELETED') {
              setEscalaCompleta(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  ajudantes: (prev.ajudantes || []).filter(a => a.id !== msg.data.id)
                };
              });
            }
          } catch (err) {
            console.error('Erro ao ler mensagem WS:', err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          clearInterval(heartbeatInterval);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          clearInterval(heartbeatInterval);
          ws.close();
        };
      } catch {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [dataOperacao, fetchEscala]);

  // Handlers para salvar e deletar
  const handleSaveTransferencia = async (t: ViagemTransferencia) => {
    // Atualização otimista local
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      const exists = prev.transferencias.some(item => item.id === t.id);
      return {
        ...prev,
        transferencias: exists
          ? prev.transferencias.map(item => item.id === t.id ? t : item)
          : [t, ...prev.transferencias]
      };
    });

    try {
      await fetch('/api/viagens/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t)
      });
    } catch (err) {
      console.error('Erro ao salvar transferência:', err);
    }
  };

  const handleDeleteTransferencia = async (id: string) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        transferencias: prev.transferencias.filter(item => item.id !== id)
      };
    });

    try {
      await fetch(`/api/viagens/transferencia/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar transferência:', err);
    }
  };

  const handleSaveDistribuicao = async (d: ViagemDistribuicao) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      const exists = prev.distribuicoes.some(item => item.id === d.id);
      return {
        ...prev,
        distribuicoes: exists
          ? prev.distribuicoes.map(item => item.id === d.id ? d : item)
          : [d, ...prev.distribuicoes]
      };
    });

    try {
      await fetch('/api/viagens/distribuicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      });
    } catch (err) {
      console.error('Erro ao salvar distribuição:', err);
    }
  };

  const handleDeleteDistribuicao = async (id: string) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        distribuicoes: prev.distribuicoes.filter(item => item.id !== id)
      };
    });

    try {
      await fetch(`/api/viagens/distribuicao/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar distribuição:', err);
    }
  };

  const handleSavePlantao = async (p: PlantaoReserva) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      const exists = prev.plantoes.some(item => item.id === p.id);
      return {
        ...prev,
        plantoes: exists
          ? prev.plantoes.map(item => item.id === p.id ? p : item)
          : [p, ...prev.plantoes]
      };
    });

    try {
      await fetch('/api/plantoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
    } catch (err) {
      console.error('Erro ao salvar plantão:', err);
    }
  };

  const handleDeletePlantao = async (id: string) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plantoes: prev.plantoes.filter(item => item.id !== id)
      };
    });

    try {
      await fetch(`/api/plantoes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar plantão:', err);
    }
  };

  const handleSavePassagem = async (item: PassagemTurnoItem) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      const exists = prev.passagens?.some(p => p.id === item.id);
      return {
        ...prev,
        passagens: exists
          ? prev.passagens.map(p => p.id === item.id ? item : p)
          : [...(prev.passagens || []), item]
      };
    });

    try {
      await fetch('/api/passagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (err) {
      console.error('Erro ao salvar passagem:', err);
    }
  };

  const handleDeletePassagem = async (id: string) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        passagens: (prev.passagens || []).filter(p => p.id !== id)
      };
    });

    try {
      await fetch(`/api/passagens/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar passagem:', err);
    }
  };

  const handleSaveTemperatura = async (item: TemperaturaCrossItem) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      const exists = prev.temperaturas?.some(t => t.id === item.id);
      return {
        ...prev,
        temperaturas: exists
          ? prev.temperaturas.map(t => t.id === item.id ? item : t)
          : [...(prev.temperaturas || []), item]
      };
    });

    try {
      await fetch('/api/temperaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (err) {
      console.error('Erro ao salvar temperatura:', err);
    }
  };

  const handleDeleteTemperatura = async (id: string) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        temperaturas: (prev.temperaturas || []).filter(t => t.id !== id)
      };
    });

    try {
      await fetch(`/api/temperaturas/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar temperatura:', err);
    }
  };

  const handleSaveAjudante = async (item: AjudanteOperacao) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      const exists = prev.ajudantes?.some(a => a.id === item.id);
      return {
        ...prev,
        ajudantes: exists
          ? prev.ajudantes.map(a => a.id === item.id ? item : a)
          : [...(prev.ajudantes || []), item]
      };
    });

    try {
      await fetch('/api/ajudantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (err) {
      console.error('Erro ao salvar ajudante:', err);
    }
  };

  const handleDeleteAjudante = async (id: string) => {
    setEscalaCompleta(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ajudantes: (prev.ajudantes || []).filter(a => a.id !== id)
      };
    });

    try {
      await fetch(`/api/ajudantes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Erro ao deletar ajudante:', err);
    }
  };

  const handleExportExcel = () => {
    const url = dateMode === 'range' 
      ? `/api/export/xlsx?inicio=${dataInicio}&fim=${dataFim}`
      : `/api/export/xlsx?data=${dataOperacao}`;
    window.open(url, '_blank');
  };

  const handleDownloadBackup = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/backup/sqlite', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        alert('Erro ao baixar backup: ' + res.statusText);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logistics-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erro ao realizar download do banco: ' + err.message);
    }
  };

  const handlePrintPatio = useCallback(() => {
    setActiveTab('patio');
    setTimeout(() => {
      window.print();
    }, 200);
  }, []);

  // Atalhos Globais de Teclado (wcag-audit-patterns & ergonomia da torre)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: Fecha modais abertos
      if (e.key === 'Escape') {
        setIsImportOpen(false);
        setIsWhatsAppOpen(false);
      }

      // Ctrl/Cmd + I: Abre modal de importação
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsImportOpen(true);
      }

      // Ctrl/Cmd + P: Visualização e Impressão do Pátio
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintPatio();
      }

      // Ctrl/Cmd + K ou barra '/': Foca no campo de busca ativa
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrintPatio]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Iniciando Control Tower...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      {/* Header Fixo */}
      <Header
        dataOperacao={dataOperacao}
        setDataOperacao={setDataOperacao}
        dateMode={dateMode}
        setDateMode={setDateMode}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
        onApplyPeriodo={handleApplyPeriodo}
        escalaCompleta={escalaCompleta}
        wsConnected={wsConnected}
        clientsCount={clientsCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        token={token || ''}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        onExportExcel={handleExportExcel}
        onDownloadBackup={handleDownloadBackup}
        onPrintPatio={handlePrintPatio}
        onRefresh={() => dateMode === 'single' ? fetchEscala(dataOperacao) : fetchPeriodo(dataInicio, dataFim)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {activeTab === 'dashboard' && (
          <DashboardTab
            escalaCompleta={escalaCompleta}
            dataOperacao={dataOperacao}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'transferencias' && (
          <TransferenciasTab
            transferencias={escalaCompleta?.transferencias || []}
            escalaId={escalaCompleta?.escala.id || ''}
            onSave={handleSaveTransferencia}
            onDelete={handleDeleteTransferencia}
          />
        )}

        {activeTab === 'distribuicao' && (
          <DistribuicaoTab
            distribuicoes={escalaCompleta?.distribuicoes || []}
            escalaId={escalaCompleta?.escala.id || ''}
            onSave={handleSaveDistribuicao}
            onDelete={handleDeleteDistribuicao}
            initialFilterSpecial={distribuicaoFilter}
          />
        )}

        {activeTab === 'ajudantes' && (
          <AjudantesTab
            ajudantes={escalaCompleta?.ajudantes || []}
            escalaId={escalaCompleta?.escala.id || ''}
            dataOperacao={dataOperacao}
            onSave={handleSaveAjudante}
            onDelete={handleDeleteAjudante}
          />
        )}

        {activeTab === 'patio' && (
          <PatioViewTab
            distribuicoes={escalaCompleta?.distribuicoes || []}
            transferencias={escalaCompleta?.transferencias || []}
            dataOperacao={dataOperacao}
            onSaveDistribuicao={handleSaveDistribuicao}
          />
        )}

        {activeTab === 'passagem' && (
          <PassagemTurnoTab
            passagens={escalaCompleta?.passagens || []}
            escalaId={escalaCompleta?.escala?.id || ''}
            dataOperacao={dataOperacao}
            onSave={handleSavePassagem}
            onDelete={handleDeletePassagem}
          />
        )}

        {activeTab === 'temperatura' && (
          <TemperaturaCrossTab
            temperaturas={escalaCompleta?.temperaturas || []}
            escalaId={escalaCompleta?.escala?.id || ''}
            dataOperacao={dataOperacao}
            onSave={handleSaveTemperatura}
            onDelete={handleDeleteTemperatura}
          />
        )}

        {activeTab === 'plantoes' && (
          <PlantoesTab
            plantoes={escalaCompleta?.plantoes || []}
            escalaId={escalaCompleta?.escala?.id || ''}
            onSave={handleSavePlantao}
            onDelete={handleDeletePlantao}
          />
        )}
      </main>

      {/* Modais */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        dataOperacao={dataOperacao}
        onImportSuccess={() => dateMode === 'single' ? fetchEscala(dataOperacao) : fetchPeriodo(dataInicio, dataFim)}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        dataOperacao={dataOperacao}
        escalaCompleta={escalaCompleta}
      />
    </div>
  );
}
export default App;
