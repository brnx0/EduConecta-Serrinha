import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../services/pushTokens';
import { getNotifications } from '../lib/notifications';

/**
 * Após login, pede permissão de notificação, obtém o ExpoPushToken e
 * registra na nova API. No-op em emulador (Device.isDevice=false) ou em
 * Expo Go (SDK 53+ removeu push notifications remote — usar dev build).
 */
export function useExpoPushToken() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!Device.isDevice) return;

    const Notifications = getNotifications();
    if (!Notifications) return;

    let cancelled = false;
    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('presenca', {
            name: 'Presença',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        const expoConfig = (Constants.expoConfig ?? {}) as {
          extra?: { eas?: { projectId?: string } };
        };
        const easConfig = (Constants as unknown as { easConfig?: { projectId?: string } })
          .easConfig;
        const projectId = expoConfig.extra?.eas?.projectId ?? easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        if (cancelled) return;

        await registerPushToken({
          token: tokenData.data,
          platform: Platform.OS as 'ios' | 'android',
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[useExpoPushToken] erro ao registrar token', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);
}
