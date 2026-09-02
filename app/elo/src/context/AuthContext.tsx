import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Autenticar } from '../services/login/LoginService';
import { jwtDecode } from 'jwt-decode';
import { api, registerApiInterceptors } from '../services/api';
import { registerApiNotificationsInterceptors } from '../services/apiNotifications';
import { useAlert } from './AlertContext';
import { JwtPayload } from '../services/api';

interface AuthContextData {
    user: JwtPayload | null;
    signIn: (cpf: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export async function getDecodedUser(): Promise<JwtPayload | null> {
    const token = await SecureStore.getItemAsync('token');

    if (!token) return null;

    try {
        const decoded = jwtDecode<JwtPayload>(token);

        if (decoded.exp * 1000 < Date.now()) {
            await SecureStore.deleteItemAsync('token');
            return null;
        }

        // Detecta token do backend legado (Maker): payload usa campos
        // UPPERCASE (USR_CODIGO, NOME). API nova emite shape lowercase
        // (usr_codigo, responsavel_nome, alunos). Tokens incompatíveis
        // ficam no Keychain após uninstall — limpamos aqui pra forçar
        // novo login com formato atual.
        const legacyShape = (decoded as any).USR_CODIGO !== undefined;
        const validShape = decoded.usr_codigo !== undefined && Array.isArray(decoded.alunos);
        if (legacyShape || !validShape) {
            await SecureStore.deleteItemAsync('token');
            return null;
        }

        return decoded;

    } catch (error) {
        return null;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<JwtPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useAlert();

    useEffect(() => {
        async function loadStorageData() {
            const decodedUser = await getDecodedUser();
            setUser(decodedUser);
            setLoading(false);
        }

        loadStorageData();
    }, []);

    async function signIn(cpf: string, pass: string) {
        const response = await Autenticar(cpf, pass);
        const tokenString = response.token;
        await SecureStore.setItemAsync('token', tokenString);
        const decodedUser = await getDecodedUser();
        setUser(decodedUser);
    }

    async function signOut() {
        await SecureStore.deleteItemAsync('token');
        setUser(null);
    }

    useEffect(() => {
        registerApiInterceptors(signOut, showToast);
        registerApiNotificationsInterceptors(signOut, showToast);
    }, [showToast]);

    return (
        <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    return useContext(AuthContext);
}