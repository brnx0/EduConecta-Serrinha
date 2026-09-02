import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { config } from '../config.js';

const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN || undefined,
  useFcmV1: true,
});

export interface ExpoClient {
  isValidPushToken(token: string): boolean;
  sendPushNotificationsAsync(
    messages: ExpoPushMessage[]
  ): Promise<ExpoPushTicket[]>;
}

export const expoClient: ExpoClient = {
  isValidPushToken(token) {
    return Expo.isExpoPushToken(token);
  },
  async sendPushNotificationsAsync(messages) {
    const tickets: ExpoPushTicket[] = [];
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    }
    return tickets;
  },
};

export type { ExpoPushMessage, ExpoPushTicket };
