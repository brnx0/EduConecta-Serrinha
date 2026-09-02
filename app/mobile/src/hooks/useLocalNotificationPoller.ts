import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarNotificacoes, type NotificacaoDTO } from '../services/notificacoes';
import { getNotifications } from '../lib/notifications';

const POLL_INTERVAL_MS = 10_000;

/**
 * Poll periódico em GET /notificacoes?limit=5. Quando detecta notificações
 * NOVAS (id ainda não visto e ainda não lidas), agenda uma notificação local
 * via expo-notifications. Resultado visual: banner igual ao de push real,
 * mesmo em Expo Go ou emulador sem FCM.
 */
export function useLocalNotificationPoller() {
  const { user } = useAuth();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) {
      initialized.current = false;
      seenIds.current.clear();
      return;
    }

    const Notifications = getNotifications();
    if (!Notifications) return;

    let cancelled = false;

    async function ensurePermission(): Promise<boolean> {
      if (!Notifications) return false;
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') return true;
      const req = await Notifications.requestPermissionsAsync();
      return req.status === 'granted';
    }

    async function tick() {
      try {
        const res = await listarNotificacoes({ limit: 5 });
        const items: NotificacaoDTO[] = res.items;

        // primeira execução: marca tudo como já visto, não dispara nada
        if (!initialized.current) {
          items.forEach((n) => seenIds.current.add(n.id));
          initialized.current = true;
          return;
        }

        // dispara local notif pras novas + não lidas
        const novas = items.filter((n) => !seenIds.current.has(n.id) && !n.lidaEm);
        for (const n of novas) {
          seenIds.current.add(n.id);
          if (cancelled || !Notifications) return;
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: n.titulo,
                body: n.corpo,
                data: { notificacaoId: n.id, eventoId: n.id },
                sound: 'default',
              },
              trigger: null, // mostra imediatamente
            });
          } catch {
            // silencia
          }
        }
      } catch {
        // silencia — UX não-bloqueante
      }
    }

    (async () => {
      const ok = await ensurePermission();
      if (!ok || cancelled) return;
      await tick();
    })();

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);
}
