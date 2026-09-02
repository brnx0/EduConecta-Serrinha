import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { getNotifications } from '../lib/notifications';

/**
 * Listener de tap em notificação. Ao tocar, navega para tela "Notificacoes".
 * Funciona com app em foreground, background ou fechado.
 *
 * Em Expo Go (SDK 53+), push notifications remote são bloqueadas — vira no-op.
 */
export function useNotificationListener() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      try {
        navigation.navigate('Notificacoes', {
          highlightId: (data as { eventoId?: string }).eventoId,
        });
      } catch {
        // se rota ainda não estiver registrada, ignora
      }
    });

    return () => sub.remove();
  }, [navigation]);
}
