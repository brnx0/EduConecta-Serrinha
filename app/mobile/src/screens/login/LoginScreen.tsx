import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../routes';
import { useAlert } from '../../context/AlertContext';
import { FormInput } from '../../components/forms/FormInput';
import { useAuth } from '../../context/AuthContext';
import RecuperarSenha from './RecuperarSenha';

// Tipagem da navegação
type LoginScreenProp = NativeStackNavigationProp<RootStackParamList, 'LoginScreen'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenProp>();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [visibleModal, setVisibleModal] = useState(false);
  const { showToast, showAlert, showConfirm } = useAlert();
  const { signIn } = useAuth();

  const handleCpfChange = (text: string) => {
    let v = text.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCpf(v);
    if (errors.cpf_aluno) setErrors(prev => ({ ...prev, cpf_aluno: '' }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!cpf) newErrors.cpf = "CPF incompleto.";
    if (!password) newErrors.senha = "Preencha a senha.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAutenticar = async () => {
    Keyboard.dismiss();

    if (!validate()) return;

    setIsLoading(true);

    try {

      await signIn(cpf.replace(/\D/g, ''), password);

      showToast("Login realizado com sucesso", 'success');

    } catch (error: any) {

      const msg = error.message;

      if (msg.includes("deseja realizar o cadastro agora")) {
        showConfirm("Atenção",
          msg,
          () => {
            navigation.navigate("PrimeiroAcessoScreen", { cpfLogin: cpf })
          }
        )
      } else {
        showAlert("Acesso Negado", msg, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white">
        <RecuperarSenha visible={visibleModal} onClose={() => setVisibleModal(false)} value={cpf} error={null} onSend={() => { }}/>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          className="flex-1 justify-center px-8"        >


          {/* --- CABEÇALHO --- */}
          <View className="items-center mb-10">
            <Image
              source={require('../../../assets/logo-2.png')}
              className="w-32 h-32 mb-3"
              resizeMode="contain"
            />

            <Text className="text-slate-500 text-lg mt-2">
              Bem-vindo ao <Text className="font-bold text-edu-primary">EduConecta</Text>
            </Text>
          </View>

          {/* --- FORMULÁRIO --- */}
          <View className="space-y-4">

            <FormInput
              label="CPF"
              placeholder="Digite o CPF"
              value={cpf}
              onChangeText={handleCpfChange}
              error={errors.cpf}
              keyboardType="numeric"
              maxLength={14}
              required
              autoCapitalize="none"
              icon={<Feather name="user" size={20} color="#94a3b8" />}
            />


            <FormInput
              label="Senha"
              placeholder="Digite sua senha"
              value={password}
              error={errors.senha}
              required
              onChangeText={(t) => {
                setPassword(t);
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


          </View>
          {/* --- ESQUECEU A SENHA --- */}
          <View className="items-end mt-1">
            <TouchableOpacity onPress={() => setVisibleModal(true)} className='h-10'>
              <Text className="text-edu-primary text-sm font-semibold">Esqueceu sua senha ? </Text>
            </TouchableOpacity>
          </View>
          {/* --- BOTÃO DE AÇÃO --- */}
          <View className="mt-4">
            <TouchableOpacity
              onPress={handleAutenticar}
              disabled={isLoading}
              className={`w-full h-14 rounded-xl items-center justify-center shadow-lg shadow-blue-500/30 ${isLoading ? 'bg-edu-primary/70' : 'bg-edu-primary'}`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Entrar na conta</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* --- RODAPÉ --- */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-slate-500">Não tem conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('PrimeiroAcessoScreen', {})}>
              <Text className="text-edu-primary font-bold">Primeiro Acesso</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}