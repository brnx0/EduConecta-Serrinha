import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Cliente axios separado para a nova API de notificações (app/api).
// Diferente de `api` (services/api.tsx), este envia "Authorization: Bearer <token>"
// no formato esperado pelo @fastify/jwt.
const NOTIF_API_URL = process.env.EXPO_PUBLIC_NOTIF_API_URL ?? 'http://localhost:3333';

export const apiNotifications = axios.create({
    baseURL: NOTIF_API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
    },
});

apiNotifications.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Hooks injetados via `registerApiNotificationsInterceptors` durante o
// boot do AuthContext. Mantidos como módulo-level pra não recriar
// interceptors em re-renders.
let logoutRequest: (() => void) | null = null;
let toastRequest:
    | ((message: string, type: 'success' | 'error' | 'warning') => void)
    | null = null;

// Endpoints onde 401 é esperado e NÃO deve disparar logout
// (login com senha errada, fluxo de recuperar senha, etc.).
const PUBLIC_AUTH_PATHS = [
    '/auth/login',
    '/auth/primeiro-acesso',
    '/auth/recuperar-senha',
];

function isPublicAuthRequest(url?: string): boolean {
    if (!url) return false;
    return PUBLIC_AUTH_PATHS.some((p) => url.includes(p));
}

apiNotifications.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const url = error.config?.url;

        if ((status === 401 || status === 403) && !isPublicAuthRequest(url)) {
            if (toastRequest) {
                toastRequest('Sessão Expirada!', 'warning');
            }
            if (logoutRequest) {
                logoutRequest();
            }
        }
        return Promise.reject(error);
    }
);

export const registerApiNotificationsInterceptors = (
    signOut: () => void,
    showToast: (msg: string, type: 'success' | 'error' | 'warning') => void
) => {
    logoutRequest = signOut;
    toastRequest = showToast;
};
