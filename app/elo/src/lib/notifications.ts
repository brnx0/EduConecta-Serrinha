/**
 * Wrapper de expo-notifications que retorna no-op stub quando rodando
 * em Expo Go (SDK 53+ removeu push notifications remote no Android).
 *
 * Pra usar push em desenvolvimento, criar dev build:
 *   npx expo install expo-dev-client
 *   npx expo run:android
 */
import Constants from 'expo-constants';

export const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');

let _notifications: NotificationsModule | null = null;

/**
 * Carrega expo-notifications dinamicamente. Retorna `null` em Expo Go
 * pra evitar o erro "Android Push notifications was removed from Expo Go".
 */
export function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  if (_notifications) return _notifications;
  try {
    // Dynamic require — só executa fora de Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _notifications = require('expo-notifications') as NotificationsModule;
    return _notifications;
  } catch {
    return null;
  }
}
