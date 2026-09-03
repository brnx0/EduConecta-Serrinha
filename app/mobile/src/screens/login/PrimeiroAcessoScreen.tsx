import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';
import { useLoading } from '../../context/LoadingContext';

import { FormInput } from '../../components/forms/FormInput';
import { CriarUsuario, ValidarPrimeiroAcesso } from '../../services/login/PrimeiroAcessoService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../routes';

type PrimeiroAcessoScreenProp = NativeStackNavigationProp<RootStackParamList, 'PrimeiroAcessoScreen'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'PrimeiroAcessoScreen'>;


export default function PrimeiroAcessoScreen() {

    const navigation = useNavigation<PrimeiroAcessoScreenProp>();

    const route = useRoute<ScreenRouteProp>();

    const { cpfLogin } = route.params;

    // Controle de Fluxo
    const [step, setStep] = useState(1); // 1 = Dados, 2 = Senha
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // --- Estados do PASSO 1 (Dados) ---
    const [cpf, setCpf] = useState('');
    const [cpfAluno, setCpfAluno] = useState('');
    const [dataNasc, setDataNasc] = useState('');
    const [email, setEmail] = useState('');

    // --- Estados do PASSO 2 (Senha) ---
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { showToast, showAlert, showConfirm } = useAlert();
    const { showLoading, hideLoading } = useLoading();

    useFocusEffect(
        useCallback(() => {
            if (cpfLogin) setCpf(cpfLogin);
        }, [])
    );

    // --- Máscaras ---
    const handleCpfChange = (text: string) => {
        let v = text.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        setCpf(v);
        if (errors.cpf) setErrors(prev => ({ ...prev, cpf: '' }));
    };

    const handleCpfChangeAluno = (text: string) => {
        let v = text.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        setCpfAluno(v);
        if (errors.cpf_aluno) setErrors(prev => ({ ...prev, cpf_aluno: '' }));
    };

    const handleDateChange = (text: string) => {
        let v = text.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        v = v.replace(/(\d{2})(\d)/, "$1/$2");
        v = v.replace(/(\d{2})(\d)/, "$1/$2");
        setDataNasc(v);
        if (errors.data_nascimento) setErrors(prev => ({ ...prev, data_nascimento: '' }));
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
    };

    // --- Validação Passo 1 ---
    const validateStep1 = () => {
        const newErrors: { [key: string]: string } = {};

        if (!cpf || cpf.length < 14) newErrors.cpf = "CPF incompleto.";
        if (!cpfAluno || cpfAluno.length < 14) newErrors.cpfAluno = "CPF incompleto.";
        if (!dataNasc || dataNasc.length < 10) newErrors.data_nascimento = "Data inválida.";
        if (!email.trim() || !email.includes('@')) newErrors.email = "E-mail inválido.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // --- Ação: Verificar Dados ---
    const handleVerificarDados = async () => {
        Keyboard.dismiss();
        if (!validateStep1()) return;

        setIsLoading(true);
        showLoading("Validando seus dados...");

        try {
            await ValidarPrimeiroAcesso(
                cpf.replace(/\D/g, ''),
                cpfAluno.replace(/\D/g, ''),
                dataNasc,
                email
            );

            setStep(2);
        } catch (error: any) {
            showAlert("Opss!", error.message, "error");
        } finally {
            hideLoading();
            setIsLoading(false);
        }
    };

    const validateStep2 = () => {
        const newErrors: { [key: string]: string } = {};

        if (!senha || senha.length < 6) newErrors.senha = "A senha precisa ter no mínimo 6 caracteres.";

        if (!confirmarSenha || senha !== confirmarSenha) newErrors.repetirSenha = "As senhas não coincidem.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // --- Ação: Criar Senha ---
    const handleCriarSenha = async () => {
        Keyboard.dismiss();

        if (!validateStep2()) return;

        setIsLoading(true);
        showLoading("Criando seu cadastro...");

        try {
            await CriarUsuario(
                cpf.replace(/\D/g, ''),
                senha,
                email
            );

            hideLoading();
            setIsLoading(false);
            showToast("Cadastro efetuado com sucesso!", "success");

            navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }]
            });
        } catch (error: any) {
            hideLoading();
            setIsLoading(false);
            showAlert("Opss!", error.message, "error");
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 bg-white">
                <StatusBar style="dark" />

                {/* Botão Voltar */}
                <View className="pt-12 px-6 pb-4">
                    <TouchableOpacity
                        onPress={() => step === 1 ? navigation.goBack() : setStep(1)}
                        className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center border border-slate-100"
                    >
                        <Feather name="arrow-left" size={24} color="#334155" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1"
                >
                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* Cabeçalho */}
                        <View className="mb-8 mt-4">
                            <Text className="text-3xl font-bold text-slate-800">Primeiro Acesso</Text>
                            <Text className="text-slate-500 text-lg mt-2">
                                {step === 1
                                    ? "Vamos localizar seu cadastro."
                                    : "Agora, crie sua senha de acesso."}
                            </Text>
                        </View>

                        {/* === PASSO 1: DADOS PESSOAIS === */}
                        {step === 1 && (
                            <View>

                                <FormInput
                                    label="CPF do Responsável"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChangeText={handleCpfChange}
                                    error={errors.cpf}
                                    keyboardType="numeric"
                                    maxLength={14}
                                    required
                                    icon={<Feather name="user" size={20} color="#94a3b8" />}
                                />

                                <FormInput
                                    label="E-mail"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    error={errors.email}
                                    keyboardType="email-address"
                                    required
                                    autoCapitalize="none"
                                    icon={<Feather name="mail" size={20} color="#94a3b8" />}
                                />

                                <FormInput
                                    label="CPF do Aluno"
                                    placeholder="000.000.000-00"
                                    value={cpfAluno}
                                    onChangeText={handleCpfChangeAluno}
                                    error={errors.cpfAluno}
                                    keyboardType="numeric"
                                    required
                                    maxLength={14}
                                    icon={<Feather name="user" size={20} color="#94a3b8" />}
                                />

                                <FormInput
                                    label="Data de Nascimento do Aluno"
                                    placeholder="DD/MM/AAAA"
                                    value={dataNasc}
                                    onChangeText={handleDateChange}
                                    error={errors.data_nascimento}
                                    required
                                    keyboardType="numeric"
                                    maxLength={10}
                                    icon={<Feather name="calendar" size={20} color="#94a3b8" />}
                                />

                            </View>
                        )}

                        {/* === PASSO 2: CRIAR SENHA === */}
                        {step === 2 && (
                            <View>
                                <View className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100 flex-row">
                                    <Feather name="info" size={20} color="#1e40af" style={{ marginTop: 2 }} />
                                    <Text className="text-blue-800 text-sm ml-3 flex-1">
                                        Cadastro localizado! Crie uma senha numérica de 6 dígitos para entrar no App.
                                    </Text>
                                </View>

                                <FormInput
                                    label="Nova Senha"
                                    placeholder="Digite a senha"
                                    value={senha}
                                    error={errors.senha}
                                    maxLength={30}
                                    onChangeText={(t) => {
                                        setSenha(t);
                                        if (errors.senha) setErrors(prev => ({ ...prev, senha: '' }));
                                    }}
                                    secureTextEntry={!showPassword}
                                    icon={<Feather name="lock" size={20} color="#94a3b8" />}
                                    rightIcon={
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                                        </TouchableOpacity>
                                    }
                                />

                                <FormInput
                                    label="Confirmar Senha"
                                    placeholder="Repita a senha"
                                    value={confirmarSenha}
                                    error={errors.repetirSenha}
                                    maxLength={30}
                                    onChangeText={(t) => {
                                        setConfirmarSenha(t);
                                        if (errors.repetirSenha) setErrors(prev => ({ ...prev, repetirSenha: '' }));
                                    }}
                                    secureTextEntry={!showPassword}
                                    icon={<Feather name="check-circle" size={20} color="#94a3b8" />}
                                />
                            </View>
                        )}

                        {/* Botão de Ação */}
                        <View className="mt-8">
                            <TouchableOpacity
                                onPress={step === 1 ? handleVerificarDados : handleCriarSenha}
                                disabled={isLoading}
                                className={`w-full h-14 rounded-xl items-center justify-center shadow-lg shadow-black/20 ${isLoading ? 'bg-edu-dark/70' : 'bg-edu-dark'}`}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white text-lg font-bold">
                                        {step === 1 ? "Verificar Dados" : "Criar Senha"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
}