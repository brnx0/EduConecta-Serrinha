import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getNaoLidasCount } from '../services/notificacoes';

const POLL_INTERVAL_MS = 30_000; // 30s

/**
 * Hook que retorna a contagem de notificações não lidas. Atualiza:
 *  - ao montar
 *  - ao focar tela (useFocusEffect)
 *  - periodicamente a cada 30s
 *
 * Retorna 0 se usuário não logado ou erro.
 */
export function useNotificacoesNaoLidas(): {
  count: number;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const c = await getNaoLidasCount();
      setCount(c);
    } catch {
      // silencia — UX não-bloqueante
    }
  }, [user]);

  // Polling periódico
  useEffect(() => {
    if (!user) return;
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, refresh]);

  // Refresh quando tela ganha foco
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { count, refresh };
}
