import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import Button from '../../components/forms/Button';
import { FormInput } from '../../components/forms/FormInput';
import maskCpf from '../../util/mask';
import {
    solicitarRecuperacaoSenha,
    confirmarRecuperacaoSenha,
} from '../../services/login/RecuperarSenhaService';
import { validateCpf } from '../../util/validate';
import { useAlert } from '../../context/AlertContext';


interface RecuperarProps {
    visible: boolean,
    onClose: () => void,
    value: string,
    error: string | null,
    onSend: () => void
}

interface ResetSession {
    emailMascarado: string;
    resetToken: string;
}

const SESSAO_VAZIA: ResetSession = { emailMascarado: '', resetToken: '' };

export default function RecuperarSenha({ visible, onClose, value, error, onSend }: RecuperarProps) {

    const { showAlert } = useAlert();
    const [status, setStatus] = useState<'init' | 'await' | 'finish'>('init');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [sessao, setSessao] = useState<ResetSession>(SESSAO_VAZIA);
    const [formState, setFormState] = useState({
        cpf: '',
        code: '',
        newPassword: '',
        confirmNewPassword: ''
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
            confirmNewPassword: ''
        });
        onClose();
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        const cpfLimpo = formState.cpf.replace(/\D/g, '');
        if (status === 'init') {
            if (!validateCpf(cpfLimpo) || cpfLimpo.length !== 11) {
                newErrors.cpf = "CPF inválido.";
            }
        }
        if (status === 'await') {
            // Validação real é no backend ao confirmar; aqui só impede avançar sem 6 dígitos.
            if (formState.code.length !== 6) newErrors.code = "Digite os 6 dígitos.";
        }
        if (status === 'finish') {
            if (!formState.newPassword) newErrors.senha = "Preencha a senha.";
            if (formState.newPassword !== formState.confirmNewPassword) {
                newErrors.senha = "As senhas não coincidem.";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        setFormState((prev) => ({ ...prev, cpf: value }));
    }, [value]);

    const handleRequestCode = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            const resp = await solicitarRecuperacaoSenha(formState.cpf.replace(/\D/g, ''));
            setSessao(resp);
            setStatus('await');
        } catch (err: any) {
            showAlert('Erro', err.message || 'Erro ao solicitar código de recuperação.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = () => {
        if (validate()) {
            setStatus('finish');
        }
    };

    const handleSaveNewPassword = async () => {
        if (!validate()) return;
        try {
            setLoading(true);
            const resultado = await confirmarRecuperacaoSenha({
                resetToken: sessao.resetToken,
                codigo: formState.code,
                novaSenha: formState.newPassword,
            });

            if (resultado.ok) {
                showAlert('Sucesso', 'Senha alterada com sucesso!', 'success');
                resetForm();
                onClose();
                return;
            }

            // Mapeamento de erros do backend pra UI
            switch (resultado.erro) {
                case 'codigo_invalido': {
                    const restantes = resultado.tentativasRestantes ?? 0;
                    setErrors({ code: `Código incorreto. Tentativas restantes: ${restantes}.` });
                    setFormState((prev) => ({ ...prev, code: '' }));
                    setStatus('await');
                    break;
                }
                case 'tentativas_excedidas':
                    showAlert('Tentativas excedidas', resultado.mensagem || 'Solicite um novo código.', 'warning');
                    resetForm();
                    break;
                case 'expirado':
                    showAlert('Código expirado', resultado.mensagem || 'Solicite um novo código.', 'warning');
                    resetForm();
                    break;
                case 'token_invalido':
                default:
                    showAlert('Solicitação inválida', resultado.mensagem || 'Refaça o pedido de recuperação.', 'error');
                    resetForm();
                    break;
            }
        } catch (err: any) {
            showAlert('Erro', err.message || 'Erro ao alterar senha.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback className='flex-1 z-0'>
                <View className="flex-1 justify-center items-center bg-black/50 p-4">
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            className="w-full max-w-md z-10"
                        >
                            {status === 'init' ? (
                                <View className="w-full rounded-2xl p-6 bg-white shadow-xl">
                                    <Text className="text-xl font-bold text-slate-900 mb-4">
                                        Recuperar Senha
                                    </Text>
                                    <Text className="text-sm text-slate-500 mb-2">
                                        Digite seu CPF para receber o código de recuperação de senha no E-mail.
                                    </Text>
                                    <FormInput
                                        placeholder="000.000.000-00"
                                        value={maskCpf(formState.cpf)}
                                        onChangeText={value => {
                                            setFormState({ ...formState, cpf: value });
                                            if (errors.cpf) setErrors({ ...errors, cpf: '' });
                                        }}
                                        error={errors.cpf}
                                        keyboardType="numeric"
                                        disabled={loading}
                                        maxLength={14}
                                    />
                                    <View className="flex-row gap-3 mt-2">
                                        <Button
                                            label="Cancelar"
                                            variant="secondary"
                                            onPress={onClose}
                                            disabled={loading}
                                            className="flex-1"
                                        />
                                        <Button
                                            label={loading ? "Enviando..." : "Enviar"}
                                            loading={loading}
                                            onPress={handleRequestCode}
                                            disabled={loading || formState.cpf.length < 14}
                                            className="flex-1"
                                        />
                                    </View>
                                </View>
                            ) : status === 'await' ? (
                                <View className="w-full rounded-2xl p-6 bg-white shadow-xl">
                                    <Text className="text-xl font-bold text-slate-900 mb-1">
                                        Verifique o codigo no seu E-mail
                                    </Text>
                                    <Text className='mb-2'>
                                        Enviado para: <Text className="font-semibold">{sessao.emailMascarado}</Text>
                                    </Text>
                                    <Text className="text-sm text-slate-500 mb-2">
                                        Insira o código enviado para o seu e-mail.
                                    </Text>
                                    <FormInput
                                        placeholder="Código de verificação"
                                        value={formState.code}
                                        onChangeText={value => {
                                            setFormState({ ...formState, code: value });
                                            setErrors({ ...errors, code: '' });
                                        }}
                                        error={errors.code}
                                        keyboardType="numeric"
                                        maxLength={6}
                                    />
                                    <View className="flex-row gap-3 mt-2">
                                        <Button
                                            label="Cancelar"
                                            variant="secondary"
                                            onPress={() => { resetForm(); }}
                                            className="flex-1"
                                        />
                                        <Button
                                            label={"Verificar"}
                                            disabled={formState.code.length < 6}
                                            onPress={handleVerifyCode}
                                            className="flex-1"
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View className="w-full rounded-2xl p-6 bg-white shadow-xl">
                                    <Text className="text-xl font-bold text-slate-900 mb-4">
                                        Insira a nova senha
                                    </Text>
                                    <FormInput
                                        placeholder="Nova Senha"
                                        value={formState.newPassword}
                                        onChangeText={value => { setFormState({ ...formState, newPassword: value }); setErrors({ ...errors, senha: '' }) }}
                                        error={errors.senha}
                                        secureTextEntry
                                        maxLength={20}
                                    />
                                    <FormInput
                                        placeholder="Confirme a nova Senha"
                                        value={formState.confirmNewPassword}
                                        error={errors.confirmNewPassword || errors.senha}
                                        onChangeText={value => { setFormState({ ...formState, confirmNewPassword: value }); setErrors({ ...errors, confirmNewPassword: '' }) }}
                                        secureTextEntry
                                        maxLength={20}
                                    />
                                    <Button
                                        label="Salvar nova senha"
                                        loading={loading}
                                        disabled={loading || !(formState.newPassword.length > 5 && formState.confirmNewPassword.length > 5)}
                                        onPress={handleSaveNewPassword}
                                    />
                                </View>
                            )}
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
