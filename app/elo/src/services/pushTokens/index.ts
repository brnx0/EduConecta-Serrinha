import { apiNotifications } from '../apiNotifications';

export type Platform = 'ios' | 'android';

export interface RegisterPushTokenInput {
  token: string;
  platform: Platform;
  deviceId?: string;
}

export interface RegisterPushTokenResponse {
  id: string;
}

export async function registerPushToken(
  input: RegisterPushTokenInput
): Promise<RegisterPushTokenResponse> {
  const { data } = await apiNotifications.post<RegisterPushTokenResponse>(
    '/push-tokens',
    input
  );
  return data;
}

export async function unregisterPushToken(id: string): Promise<void> {
  await apiNotifications.delete(`/push-tokens/${id}`);
}
