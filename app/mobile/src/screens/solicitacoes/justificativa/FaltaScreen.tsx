import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { FormHandle, FormProps } from '../SolicitacoesScreen';
import { View, ScrollView } from 'react-native';
import { postPortador, putPortador } from '../../../services/solicitacoes/SolicitacaoService';


export const CadastroPortadores = forwardRef<FormHandle, FormProps>((props, ref) => {
    const { showToast, showAlert, aluno, onSucess, tipoSolicitacao, dadosSolicitacao, insertMode } = props;
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const dadosFormatados = { ...dadosSolicitacao, payload: JSON.parse(dadosSolicitacao.payload) };


    const [formState, setFormState] = useState({
        nome: dadosFormatados?.payload?.nome || '',
        cpf: dadosFormatados?.payload?.cpf || '',
        rg: dadosFormatados?.payload?.rg || '',
        telefone: dadosFormatados?.payload?.telefone || '',
        parentesco: dadosFormatados?.payload?.parentesco || '',
        aluno: aluno?.pes_cod,
        tipoSolicitacao: tipoSolicitacao
    });

    // const handleChange = (field: string, value: string) => {
    //     setFormState(prev => ({ ...prev, [field]: value }));
    // };


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
                
            </ScrollView>
        </View>
    );
});