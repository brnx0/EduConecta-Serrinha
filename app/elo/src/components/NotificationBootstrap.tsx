import { useExpoPushToken } from '../hooks/useExpoPushToken';
import { useNotificationListener } from '../hooks/useNotificationListener';

/**
 * Componente headless. Monta os hooks de notificação dentro de um lugar
 * que está embaixo de NavigationContainer e AuthProvider. Não renderiza nada.
 *
 * Em Expo Go, hooks viram no-op (push notifications precisam dev build).
 */
export function NotificationBootstrap() {
  useExpoPushToken();
  useNotificationListener();
  return null;
}
