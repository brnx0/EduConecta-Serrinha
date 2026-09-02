import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Button from '../../components/forms/Button';
import { FormInput } from '../../components/forms/FormInput';
import maskCpf from '../../util/mask';
import {
    solicitarRecuperacaoSenha,
    confirmarRecuperacaoSenha,
} from '../../services/login/RecuperarSenhaService';
import { validateCpf } from '../../util/validate';
import { useAlert } from '../../context/AlertContext';
import { colors } from '../../constants/colors';

interface Props {
    visible: boolean;
    onClose: () => void;
    value: string;
    error: string | null;
    onSend: () => void;
}

interface ResetSession {
    emailMascarado: string;
    resetToken: string;
}

const SESSAO_VAZIA: ResetSession = { emailMascarado: '', resetToken: '' };

/**
 * RecuperarSenha modal Élo — bottom sheet com 3 etapas. Cada etapa
 * tem heading editorial + form único + CTA pílula preta com chip laranja.
 */
export default function RecuperarSenha({ visible, onClose, value }: Props) {
    const { showAlert } = useAlert();
    const [status, setStatus] = useState<'init' | 'await' | 'finish'>('init');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [sessao, setSessao] = useState<ResetSession>(SESSAO_VAZIA);
    const [formState, setFormState] = useState({
        cpf: '',
        code: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const resetForm = () => {
        setStatus('init');
        setErrors({});
        setLoading(false);
        setSessao(SESSAO_VAZIA);
        setFormState({
            cpf: value || '',
            code: '',
            newPassword: '',
            confirmNewPassword: '',
        });
        onClose();
    };

    const validate = () => {
        const e: { [key: string]: string } = {};
        const cpfLimpo = formState.cpf.replace(/\D/g, '');
        if (status === 'init') {
            if (!validateCpf(cpfLimpo) || cpfLimpo.length !== 11) e.cpf = 'CPF inválido.';
        }
        if (status === 'await') {
            if (formState.code.length !== 6) e.code = 'Digite os 6 dígitos.';
        }
        if (status === 'finish') {
            if (!formState.newPassword) e.senha = 'Preencha a senha.';
            if (formState.newPassword !== formState.confirmNewPassword) {
                e.senha = 'As senhas não coincidem.';
            }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    useEffect(() => {
        setFormState((prev) => ({ ...prev, cpf: value }));
    }, [value]);

    const handleRequest = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            const resp = await solicitarRecuperacaoSenha(formState.cpf.replace(/\D/g, ''));
            setSessao(resp);
            setStatus('await');
        } catch (e: any) {
            showAlert('Erro', e.message || 'Erro ao solicitar código.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = () => {
        if (validate()) setStatus('finish');
    };

    const handleSave = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            const r = await confirmarRecuperacaoSenha({
                resetToken: sessao.resetToken,
                codigo: formState.code,
                novaSenha: formState.newPassword,
            });
            if (r.ok) {
                showAlert('Sucesso', 'Senha alterada com sucesso!', 'success');
                resetForm();
                onClose();
                return;
            }
            switch (r.erro) {
                case 'codigo_invalido': {
                    setErrors({ code: `Código incorreto. Restantes: ${r.tentativasRestantes ?? 0}.` });
                    setFormState((p) => ({ ...p, code: '' }));
                    setStatus('await');
                    break;
                }
                case 'tentativas_excedidas':
                case 'expirado':
                case 'token_invalido':
                default:
                    showAlert('Solicitação inválida', r.mensagem || 'Refaça o pedido.', 'error');
                    resetForm();
                    break;
            }
        } catch (e: any) {
            showAlert('Erro', e.message || 'Erro ao alterar senha.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View
                        style={{
                            backgroundColor: colors.paper,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            padding: 24,
                            paddingBottom: 32,
                        }}
                    >
                        <View
                            style={{
                                width: 48,
                                height: 4,
                                backgroundColor: colors.hairline,
                                borderRadius: 999,
                                alignSelf: 'center',
                                marginBottom: 16,
                            }}
                        />

                        {/* Stepper */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <StepDot active n={1} />
                            <Bar active={status !== 'init'} />
                            <StepDot active={status !== 'init'} n={2} />
                            <Bar active={status === 'finish'} />
                            <StepDot active={status === 'finish'} n={3} />
                        </View>

                        {status === 'init' && (
                            <>
                                <Title sub="Etapa 1 de 3" main="Esqueceu sua senha?" />
                                <Text style={subText}>
                                    Digite seu CPF e enviaremos um código pro e-mail cadastrado.
                                </Text>
                                <FormInput
                                    label="CPF"
                                    placeholder="000.000.000-00"
                                    value={maskCpf(formState.cpf)}
                                    onChangeText={(v) => {
                                        setFormState({ ...formState, cpf: v });
                                        if (errors.cpf) setErrors({ ...errors, cpf: '' });
                                    }}
                                    error={errors.cpf}
                                    keyboardType="numeric"
                                    disabled={loading}
                                    maxLength={14}
                                    icon={<Feather name="user" size={18} color={colors.inkSoft} />}
                                />
                                <Actions>
                                    <Button label="Cancelar" variant="secondary" onPress={resetForm} disabled={loading} />
                                    <Button
                                        label={loading ? 'Enviando...' : 'Enviar código'}
                                        loading={loading}
                                        onPress={handleRequest}
                                        disabled={loading || formState.cpf.length < 14}
                                    />
                                </Actions>
                            </>
                        )}

                        {status === 'await' && (
                            <>
                                <Title sub="Etapa 2 de 3" main="Verifique o e-mail" />
                                <Text style={subText}>
                                    Código enviado para{' '}
                                    <Text style={{ fontFamily: 'Outfit_700Bold', color: colors.ink }}>
                                        {sessao.emailMascarado}
                                    </Text>
                                </Text>
                                <FormInput
                                    label="Código"
                                    placeholder="6 dígitos"
                                    value={formState.code}
                                    onChangeText={(v) => {
                                        setFormState({ ...formState, code: v });
                                        setErrors({ ...errors, code: '' });
                                    }}
                                    error={errors.code}
                                    keyboardType="numeric"
                                    maxLength={6}
                                    icon={<Feather name="hash" size={18} color={colors.inkSoft} />}
                                />
                                <Actions>
                                    <Button label="Voltar" variant="secondary" onPress={resetForm} />
                                    <Button label="Verificar" disabled={formState.code.length < 6} onPress={handleVerify} />
                                </Actions>
                            </>
                        )}

                        {status === 'finish' && (
                            <>
                                <Title sub="Etapa 3 de 3" main="Crie sua nova senha" />
                                <Text style={subText}>Use uma senha que você consiga lembrar fácil.</Text>
                                <FormInput
                                    label="Nova senha"
                                    placeholder="Mínimo 6 caracteres"
                                    value={formState.newPassword}
                                    onChangeText={(v) => {
                                        setFormState({ ...formState, newPassword: v });
                                        setErrors({ ...errors, senha: '' });
                                    }}
                                    error={errors.senha}
                                    secureTextEntry
                                    maxLength={20}
                                    icon={<Feather name="lock" size={18} color={colors.inkSoft} />}
                                />
                                <FormInput
                                    label="Confirmar"
                                    placeholder="Repita a senha"
                                    value={formState.confirmNewPassword}
                                    error={errors.confirmNewPassword || errors.senha}
                                    onChangeText={(v) => {
                                        setFormState({ ...formState, confirmNewPassword: v });
                                        setErrors({ ...errors, confirmNewPassword: '' });
                                    }}
                                    secureTextEntry
                                    maxLength={20}
                                    icon={<Feather name="check-circle" size={18} color={colors.inkSoft} />}
                                />
                                <View style={{ marginTop: 8 }}>
                                    <Button
                                        label="Salvar senha"
                                        loading={loading}
                                        disabled={
                                            loading ||
                                            !(formState.newPassword.length > 5 && formState.confirmNewPassword.length > 5)
                                        }
                                        onPress={handleSave}
                                    />
                                </View>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function StepDot({ active, n }: { active: boolean; n: number }) {
    return (
        <View
            style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: active ? colors.brand.primary : colors.paperWarm,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 11,
                    color: active ? '#FFFFFF' : colors.inkSoft,
                }}
            >
                {n}
            </Text>
        </View>
    );
}

function Bar({ active }: { active: boolean }) {
    return (
        <View
            style={{
                flex: 1,
                height: 2,
                backgroundColor: active ? colors.brand.primary : colors.hairline,
                marginHorizontal: 6,
            }}
        />
    );
}

function Title({ sub, main }: { sub: string; main: string }) {
    return (
        <View style={{ marginBottom: 6 }}>
            <Text
                style={{
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 11,
                    color: colors.brand.primary,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                }}
            >
                {sub}
            </Text>
            <Text
                style={{
                    fontFamily: 'Outfit_700Bold',
                    fontSize: 24,
                    color: colors.ink,
                    letterSpacing: -0.8,
                    marginTop: 2,
                }}
            >
                {main}
            </Text>
        </View>
    );
}

const subText = {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 19,
    marginBottom: 18,
};

function Actions({ children }: { children: React.ReactNode }) {
    return (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>{Array.isArray(children) ? children[0] : null}</View>
            <View style={{ flex: 1 }}>{Array.isArray(children) ? children[1] : null}</View>
        </View>
    );
}
