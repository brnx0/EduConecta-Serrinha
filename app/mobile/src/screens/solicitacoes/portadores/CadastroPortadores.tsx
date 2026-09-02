import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { FormHandle, FormProps } from '../SolicitacoesScreen';
import { View, ScrollView, Alert, TextInput, } from 'react-native';
import { postPortador, putPortador } from '../../../services/solicitacoes/SolicitacaoService';
import { validateCpf, validateEmail } from '../../../util/validate';
import { FormInput } from '../../../components/forms/FormInput';
import maskCpf, { maskTel } from '../../../util/mask';

export const CadastroPortadores = forwardRef<FormHandle, FormProps>((props, ref) => {
    const { showToast, showAlert, aluno, onSucess, tipoSolicitacao, dadosSolicitacao, insertMode } = props;
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    // Backend novo já retorna payload parseado (objeto). Mantém parse
    // defensivo pra eventual string vinda do cache antigo.
    const payloadParsed = (() => {
        const p = dadosSolicitacao?.payload;
        if (!p) return {};
        if (typeof p === 'string') {
            try { return JSON.parse(p); } catch { return {}; }
        }
        return p;
    })();
    const dadosFormatados = { ...dadosSolicitacao, payload: payloadParsed };
    const inputsRef = useRef<TextInput[]>([]);
    const [formState, setFormState] = useState({
        nome: dadosFormatados?.payload?.nome || '',
        cpf: dadosFormatados?.payload?.cpf || '',
        rg: dadosFormatados?.rg || '',
        telefone: dadosFormatados?.payload?.telefone || '',
        parentesco: dadosFormatados?.payload?.parentesco || '',
        aluno: aluno?.pes_cod,
        tipoSolicitacao: tipoSolicitacao
    });

    const handleChange = (field: string, value: string) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };


    const sendForm = async () => {
        try {
            props.onLoading?.(true);
            if (!validateForm()) {
                showToast('Por favor, corrija os erros no formulário.', 'error');
                return;
            }
            insertMode ? await postPortador(formState, tipoSolicitacao): await putPortador(formState, dadosFormatados?.id);  
            showToast('Solicitação enviada com sucesso!', 'success');
            onSucess?.();
        } catch (error: any) {
            showToast(error[0].ErrorRetorno, 'error');
        } finally {
            props.onLoading?.(false);
        }
    };

    const validateForm = () => {
        const newErrors: any = {};
        // Validação de CPF 
        if (!validateCpf(formState.cpf)) {
            newErrors.cpf = 'CPF Inválido';
            inputsRef.current[1]?.focus();

        }
        //  Campos Obrigatórios Simples
        if (!formState.nome?.trim()) {
            newErrors.nome = 'Nome é obrigatório';
            inputsRef.current[0]?.focus();
        }
        if (!formState.rg?.trim()) {
            newErrors.rg = 'RG é obrigatório';
            inputsRef.current[2]?.focus();
        }
        // Validação de Telefone (DDD + 8 ou 9 dígitos)
        if (!formState.telefone) newErrors.telefone = 'Telefone é obrigatório', inputsRef.current[4]?.focus();
        if (formState.telefone.replace(/\D/g, "").length < 9 && formState.telefone) newErrors.telefone = 'Preencha o telefone completo', inputsRef.current[4]?.focus();
        if (!formState.parentesco?.trim()) {
            newErrors.parentesco = 'Parentesco é obrigatório';
            inputsRef.current[3]?.focus();
        }
        setErrors(newErrors);
        // Retorna true apenas se o objeto de erros estiver vazio
        return Object.keys(newErrors).length === 0;
    };
    useImperativeHandle(ref, () => ({
        submit: async () => {
            await sendForm();
        }
    }));


    return (
        <View className="rounded-lg mb-2 p-1 max-h-[450px] flex-1 bg-white">
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                className='bg-white'
                contentContainerStyle={{ paddingBottom: 10 }} // ESPAÇO EXTRA PARA SUBIR
            >
                <FormInput
                    ref={(el: TextInput) => { inputsRef.current[0] = el!; }}
                    label='Nome'
                    required={true}
                    placeholder="Digite o nome completo"
                    maxLength={30}
                    value={formState.nome}
                    onChangeText={(text) => handleChange('nome', text)}
                    error={errors.nome}
                />
                <FormInput
                    ref={(el: TextInput) => { inputsRef.current[1] = el!; }}
                    label='CPF'
                    required={true}
                    placeholder="000.000.000-00"
                    value={maskCpf(formState.cpf)}
                    onChangeText={(text) => handleChange('cpf', maskCpf(text))}
                    keyboardType="numeric"
                    error={errors.cpf}
                />

                <FormInput
                    ref={(el: TextInput) => { inputsRef.current[2] = el!; }}
                    label='RG'
                    placeholder="Digite o RG"
                    required={true}
                    maxLength={15}
                    value={formState.rg}
                    error={errors.rg}
                    onChangeText={(text) => { handleChange('rg', text); }}
                />

                <FormInput
                    ref={(el: TextInput) => { inputsRef.current[3] = el!; }}
                    label='Parentesco'
                    placeholder="Digite o parentesco"
                    required={true}
                    maxLength={15}
                    value={formState.parentesco}
                    onChangeText={(text) => handleChange('parentesco', text)}
                    error={errors.parentesco}
                />

                <FormInput
                    ref={(el: TextInput) => { inputsRef.current[4] = el!; }}
                    label='Telefone'
                    placeholder="(00) 00000-0000"
                    required={true}
                    error={errors.telefone}
                    value={formState.telefone}
                    onChangeText={(text) => { handleChange('telefone', maskTel(text)) }}
                    keyboardType="phone-pad"
                />

            </ScrollView>
        </View>
    );
});