import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { FormHandle, FormProps } from '../SolicitacoesScreen';
import { FormInput } from '../../../components/forms/FormInput';
import { SeletorArquivos } from '../../../components/forms/Upload';
import { DocumentPickerAsset } from 'expo-document-picker';
import { postAtualizacaoCadastral, putAtualizacaoCadastral } from '../../../services/solicitacoes/SolicitacaoService';
import * as FileSystem from 'expo-file-system/legacy';


export const AtualizacaoCadastral = forwardRef<FormHandle, FormProps>((props, ref) => {
    const { showToast, onSucess, onLoading, aluno, tipoSolicitacao, dadosSolicitacao, insertMode } = props;

    const [formState, setFormState] = useState({
        aluno: aluno?.pes_cod,
        tipoSolicitacao: tipoSolicitacao,
        descricao: (() => {
            try {
                if (!dadosSolicitacao?.payload) return '';
                const parsed = typeof dadosSolicitacao.payload === 'string'
                    ? JSON.parse(dadosSolicitacao.payload)
                    : dadosSolicitacao.payload;
                return parsed?.descricao || (typeof parsed === 'string' ? parsed : '');
            } catch (e) {
                return dadosSolicitacao?.payload || '';
            }
        })(),
        anexos: [] as DocumentPickerAsset[]
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const handleChange = (field: string, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        const newErrors: any = {};
        if (!formState.descricao?.trim()) newErrors.descricao = 'Descrição é obrigatória';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const sendForm = async () => {
        if (!validateForm()) return;
        try {
            props.onLoading?.(true);

            const anexosProcessados = await Promise.all(
                formState.anexos.map(async (arquivo) => {
                    const base64 = await FileSystem.readAsStringAsync(arquivo.uri, {
                        encoding: 'base64',
                    });
                    return {
                        nome: arquivo.name,
                        formato: arquivo.name.split('.').pop() || 'bin',
                        conteudo: base64,
                    };
                })
            );

            const payload = {
                aluno: formState.aluno!,
                tipoSolicitacao: formState.tipoSolicitacao,
                descricao: formState.descricao,
                arquivos: anexosProcessados,
            };

            insertMode
                ? await postAtualizacaoCadastral(payload)
                : await putAtualizacaoCadastral(payload, dadosSolicitacao?.id);

            showToast('Solicitação e anexos enviados com sucesso!', 'success');
            onSucess?.();
        } catch (error: any) {
            console.error('Erro no envio:', error);
            const mensagem = error?.message || 'Erro ao converter ou enviar arquivos';
            showToast(mensagem, 'error');
        } finally {
            props.onLoading?.(false);
        }
    };

    useImperativeHandle(ref, () => ({
        submit: async () => await sendForm()
    }));

    return (
        <View className="rounded-lg max-h-[500px] flex-1 bg-white">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <FormInput
                    label="Descrição/Observação"
                    required={true}
                    placeholder="Descreva a atualização..."
                    multiline={true}
                    value={formState.descricao}
                    onChangeText={(text) => handleChange('descricao', text)}
                    error={errors.descricao}
                />


                <SeletorArquivos
                    onFilesChange={(files) => handleChange('anexos', files)}
                />
            </ScrollView>
        </View>
    );
});