import { useExpoPushToken } from '../hooks/useExpoPushToken';
import { useNotificationListener } from '../hooks/useNotificationListener';
import { useLocalNotificationPoller } from '../hooks/useLocalNotificationPoller';

/**
 * Componente headless. Monta os hooks de notificação dentro de um lugar
 * que está embaixo de NavigationContainer e AuthProvider. Não renderiza nada.
 *
 * Em Expo Go, push remoto (useExpoPushToken) vira no-op, mas o poller
 * de notificação local (useLocalNotificationPoller) dispara banners
 * via scheduleNotificationAsync — visualmente idêntico ao push real.
 */
export function NotificationBootstrap() {
  useExpoPushToken();
  useNotificationListener();
  useLocalNotificationPoller();
  return null;
}
