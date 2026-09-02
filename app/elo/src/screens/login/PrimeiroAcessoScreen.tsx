import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../routes';
import { useAlert } from '../../context/AlertContext';
import { useLoading } from '../../context/LoadingContext';
import { FormInput } from '../../components/forms/FormInput';
import { CriarUsuario, ValidarPrimeiroAcesso } from '../../services/login/PrimeiroAcessoService';
import { colors } from '../../constants/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PrimeiroAcessoScreen'>;
type RouteP = RouteProp<RootStackParamList, 'PrimeiroAcessoScreen'>;

/**
 * PrimeiroAcessoScreen Élo — wizard 2 passos com stepper
 * tipográfico no topo. CTA pílula preta + chip laranja interno.
 */
export default function PrimeiroAcessoScreen() {
    const navigation = useNavigation<NavProp>();
    const route = useRoute<RouteP>();
    const { cpfLogin } = route.params;

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const [cpf, setCpf] = useState('');
    const [cpfAluno, setCpfAluno] = useState('');
    const [dataNasc, setDataNasc] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { showToast, showAlert } = useAlert();
    const { showLoading, hideLoading } = useLoading();

    useFocusEffect(
        useCallback(() => {
            if (cpfLogin) setCpf(cpfLogin);
        }, [])
    );

    const maskCPF = (v: string) => {
        v = v.replace(/\D/g, '').slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        return v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    };
    const maskDate = (v: string) => {
        v = v.replace(/\D/g, '').slice(0, 8);
        v = v.replace(/(\d{2})(\d)/, '$1/$2');
        return v.replace(/(\d{2})(\d)/, '$1/$2');
    };

    const validateStep1 = () => {
        const e: { [k: string]: string } = {};
        if (!cpf || cpf.length < 14) e.cpf = 'CPF incompleto.';
        if (!cpfAluno || cpfAluno.length < 14) e.cpfAluno = 'CPF incompleto.';
        if (!dataNasc || dataNasc.length < 10) e.data_nascimento = 'Data inválida.';
        if (!email.trim() || !email.includes('@')) e.email = 'E-mail inválido.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleVerificar = async () => {
        Keyboard.dismiss();
        if (!validateStep1()) return;
        setIsLoading(true);
        showLoading('Validando seus dados...');
        try {
            await ValidarPrimeiroAcesso(cpf.replace(/\D/g, ''), cpfAluno.replace(/\D/g, ''), dataNasc, email);
            setStep(2);
        } catch (error: any) {
            showAlert('Opss!', error.message, 'error');
        } finally {
            hideLoading();
            setIsLoading(false);
        }
    };

    const validateStep2 = () => {
        const e: { [k: string]: string } = {};
        if (!senha || senha.length < 6) e.senha = 'Mínimo 6 caracteres.';
        if (!confirmarSenha || senha !== confirmarSenha) e.repetirSenha = 'Senhas não coincidem.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleCriar = async () => {
        Keyboard.dismiss();
        if (!validateStep2()) return;
        setIsLoading(true);
        showLoading('Criando seu cadastro...');
        try {
            await CriarUsuario(cpf.replace(/\D/g, ''), senha, email);
            hideLoading();
            setIsLoading(false);
            showToast('Cadastro efetuado com sucesso!', 'success');
            navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
        } catch (error: any) {
            hideLoading();
            setIsLoading(false);
            showAlert('Opss!', error.message, 'error');
        }
    };

    const handleDevFill = () => {
        setCpf('126.944.475-11');
        setEmail('alicia@teste.com');
        setCpfAluno('006.111.935-07');
        setDataNasc('01/09/2020');
        setErrors({});
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: colors.paper }}>
                <StatusBar style="dark" />

                <View style={{ paddingTop: 56, paddingHorizontal: 22, paddingBottom: 12 }}>
                    <TouchableOpacity
                        onPress={() => (step === 1 ? navigation.goBack() : setStep(1))}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: colors.paperWarm,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Feather name="arrow-left" size={20} color={colors.ink} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Stepper */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <StepDot active n={1} />
                            <View
                                style={{
                                    flex: 1,
                                    height: 2,
                                    marginHorizontal: 8,
                                    backgroundColor: step === 2 ? colors.brand.primary : colors.hairline,
                                }}
                            />
                            <StepDot active={step === 2} n={2} />
                        </View>

                        <Text
                            style={{
                                fontFamily: 'Outfit_500Medium',
                                fontSize: 11,
                                color: colors.brand.primary,
                                letterSpacing: 1.5,
                                textTransform: 'uppercase',
                                marginTop: 8,
                            }}
                        >
                            Passo {step} de 2
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Outfit_700Bold',
                                fontSize: 30,
                                color: colors.ink,
                                letterSpacing: -1.2,
                                lineHeight: 34,
                                marginTop: 4,
                            }}
                        >
                            {step === 1 ? 'Cadastro\nrápido' : 'Crie sua\nsenha'}
                            <Text style={{ color: colors.brand.primary }}>.</Text>
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'Outfit_400Regular',
                                fontSize: 14,
                                color: colors.inkSoft,
                                marginTop: 10,
                                marginBottom: 24,
                                lineHeight: 21,
                            }}
                        >
                            {step === 1
                                ? 'Pra começar, vamos confirmar seus dados com a escola.'
                                : 'Quase lá! Defina uma senha pra entrar no app.'}
                        </Text>

                        {step === 1 ? (
                            <View>
                                <FormInput
                                    label="CPF do responsável"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChangeText={(t) => {
                                        setCpf(maskCPF(t));
                                        if (errors.cpf) setErrors((p) => ({ ...p, cpf: '' }));
                                    }}
                                    error={errors.cpf}
                                    keyboardType="numeric"
                                    maxLength={14}
                                    required
                                    icon={<Feather name="user" size={18} color={colors.inkSoft} />}
                                />
                                <FormInput
                                    label="E-mail"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChangeText={(t) => {
                                        setEmail(t);
                                        if (errors.email) setErrors((p) => ({ ...p, email: '' }));
                                    }}
                                    error={errors.email}
                                    keyboardType="email-address"
                                    required
                                    autoCapitalize="none"
                                    icon={<Feather name="mail" size={18} color={colors.inkSoft} />}
                                />
                                <FormInput
                                    label="CPF do aluno"
                                    placeholder="000.000.000-00"
                                    value={cpfAluno}
                                    onChangeText={(t) => {
                                        setCpfAluno(maskCPF(t));
                                        if (errors.cpfAluno) setErrors((p) => ({ ...p, cpfAluno: '' }));
                                    }}
                                    error={errors.cpfAluno}
                                    keyboardType="numeric"
                                    maxLength={14}
                                    required
                                    icon={<Feather name="user" size={18} color={colors.inkSoft} />}
                                />
                                <FormInput
                                    label="Nascimento do aluno"
                                    placeholder="DD/MM/AAAA"
                                    value={dataNasc}
                                    onChangeText={(t) => {
                                        setDataNasc(maskDate(t));
                                        if (errors.data_nascimento) setErrors((p) => ({ ...p, data_nascimento: '' }));
                                    }}
                                    error={errors.data_nascimento}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    required
                                    icon={<Feather name="calendar" size={18} color={colors.inkSoft} />}
                                />
                            </View>
                        ) : (
                            <View>
                                <View
                                    style={{
                                        backgroundColor: colors.brand.secondaryLight,
                                        padding: 14,
                                        borderRadius: 16,
                                        marginBottom: 16,
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Feather name="check-circle" size={18} color={colors.brand.secondaryDark} />
                                    <Text
                                        style={{
                                            color: colors.brand.secondaryDark,
                                            fontFamily: 'Outfit_500Medium',
                                            fontSize: 13,
                                            marginLeft: 10,
                                            flex: 1,
                                            lineHeight: 18,
                                        }}
                                    >
                                        Cadastro localizado! Crie uma senha forte pra acessar o app.
                                    </Text>
                                </View>

                                <FormInput
                                    label="Nova senha"
                                    placeholder="Mínimo 6 caracteres"
                                    value={senha}
                                    onChangeText={(t) => {
                                        setSenha(t);
                                        if (errors.senha) setErrors((p) => ({ ...p, senha: '' }));
                                    }}
                                    error={errors.senha}
                                    maxLength={30}
                                    secureTextEntry={!showPassword}
                                    icon={<Feather name="lock" size={18} color={colors.inkSoft} />}
                                    rightIcon={
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.inkSoft} />
                                        </TouchableOpacity>
                                    }
                                />
                                <FormInput
                                    label="Confirmar senha"
                                    placeholder="Repita a senha"
                                    value={confirmarSenha}
                                    onChangeText={(t) => {
                                        setConfirmarSenha(t);
                                        if (errors.repetirSenha) setErrors((p) => ({ ...p, repetirSenha: '' }));
                                    }}
                                    error={errors.repetirSenha}
                                    maxLength={30}
                                    secureTextEntry={!showPassword}
                                    icon={<Feather name="check-circle" size={18} color={colors.inkSoft} />}
                                />
                            </View>
                        )}

                        {__DEV__ && step === 1 && (
                            <TouchableOpacity
                                onPress={handleDevFill}
                                style={{
                                    marginTop: 8,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    alignItems: 'center',
                                    backgroundColor: colors.paperWarm,
                                    borderWidth: 1,
                                    borderColor: colors.hairline,
                                    borderStyle: 'dashed',
                                }}
                            >
                                <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 12, color: colors.inkSoft }}>
                                    Preencher dados de teste
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={step === 1 ? handleVerificar : handleCriar}
                            disabled={isLoading}
                            activeOpacity={0.85}
                            style={{
                                marginTop: 24,
                                width: '100%',
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: colors.ink,
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isLoading ? 0.6 : 1,
                                flexDirection: 'row',
                            }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                                        {step === 1 ? 'Verificar dados' : 'Criar senha'}
                                    </Text>
                                    <View
                                        style={{
                                            marginLeft: 10,
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: colors.brand.primary,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Feather name="arrow-right" size={16} color="#FFFFFF" />
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );
}

function StepDot({ active, n }: { active: boolean; n: number }) {
    return (
        <View
            style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: active ? colors.brand.primary : colors.paperWarm,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: active ? colors.brand.primary : colors.hairline,
            }}
        >
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 12,
                    color: active ? '#FFFFFF' : colors.inkSoft,
                }}
            >
                {n}
            </Text>
        </View>
    );
}
