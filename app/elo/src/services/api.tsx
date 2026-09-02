import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

// Variáveis para guardar as funções que virão do React
let logoutRequest: (() => void) | null = null;
let toastRequest: ((message: string, type: 'success' | 'error' | 'warning') => void) | null = null;

export interface AlunoToken {
    pes_cod: number;
    nome: string;
    cpf: string;
}

export interface JwtPayload {
    usr_codigo: string;
    responsavel_nome: string;
    alunos: AlunoToken[]; 
    iat: number;
    exp: number;
}

const API_URL = process.env.EXPO_PUBLIC_URL_API;

export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {
        const status = error.response?.status;

        if (status === 401 || status === 403) {
            if (logoutRequest) {
                
                if (toastRequest) {
                    toastRequest("Sessão Expirada!", 'warning');
                }
                
                logoutRequest();
            }
        }
        
        return Promise.reject(error);
    }
);

export const registerApiInterceptors = (
    signOut: () => void, 
    showToast: (msg: string, type: any) => void
) => {
    logoutRequest = signOut;
    toastRequest = showToast;
};