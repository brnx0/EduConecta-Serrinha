import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
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
import { colors } from '../../constants/colors';

type LoginScreenProp = NativeStackNavigationProp<RootStackParamList, 'LoginScreen'>;

/**
 * LoginScreen Élo — wordmark grande no topo, formulário ancorado
 * embaixo, CTA pílula laranja sólido. Background paper. Sem ilustrações.
 */
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
    let v = text.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(v);
    if (errors.cpf) setErrors((prev) => ({ ...prev, cpf: '' }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!cpf) newErrors.cpf = 'CPF incompleto.';
    if (!password) newErrors.senha = 'Preencha a senha.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAutenticar = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await signIn(cpf.replace(/\D/g, ''), password);
      showToast('Login realizado com sucesso', 'success');
    } catch (error: any) {
      const msg = error.message;
      if (msg.includes('deseja realizar o cadastro agora')) {
        showConfirm('Atenção', msg, () => {
          navigation.navigate('PrimeiroAcessoScreen', { cpfLogin: cpf });
        });
      } else {
        showAlert('Acesso Negado', msg, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <RecuperarSenha
          visible={visibleModal}
          onClose={() => setVisibleModal(false)}
          value={cpf}
          error={null}
          onSend={() => {}}
        />
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={{ flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 24 }}
        >
          {/* Wordmark */}
          <View style={{ marginBottom: 48 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.brand.primary,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 6,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 13,
                  letterSpacing: 2,
                }}
              >
                ÉLO
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 40,
                color: colors.ink,
                letterSpacing: -2,
                lineHeight: 44,
              }}
            >
              Olá!{'\n'}Bom te ver
              <Text style={{ color: colors.brand.primary }}>.</Text>
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 15,
                color: colors.inkSoft,
                marginTop: 12,
                lineHeight: 22,
              }}
            >
              Entre com seu CPF e senha pra acompanhar a rotina escolar do seu filho.
            </Text>
          </View>

          {/* Formulário */}
          <View style={{ gap: 14 }}>
            <FormInput
              label="CPF"
              placeholder="000.000.000-00"
              value={cpf}
              onChangeText={handleCpfChange}
              error={errors.cpf}
              keyboardType="numeric"
              maxLength={14}
              required
              autoCapitalize="none"
              icon={<Feather name="user" size={20} color={colors.inkSoft} />}
            />
            <FormInput
              label="Senha"
              placeholder="Digite sua senha"
              value={password}
              error={errors.senha}
              required
              onChangeText={(t) => {
                setPassword(t);
                if (errors.senha) setErrors((prev) => ({ ...prev, senha: '' }));
              }}
              secureTextEntry={!showPassword}
              icon={<Feather name="lock" size={20} color={colors.inkSoft} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.inkSoft} />
                </TouchableOpacity>
              }
            />
          </View>

          <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <TouchableOpacity onPress={() => setVisibleModal(true)}>
              <Text
                style={{
                  color: colors.brand.primary,
                  fontFamily: 'Outfit_600SemiBold',
                  fontSize: 13,
                }}
              >
                Esqueceu sua senha?
              </Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <View style={{ marginTop: 28 }}>
            <TouchableOpacity
              onPress={handleAutenticar}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
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
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontFamily: 'Outfit_700Bold',
                      fontSize: 16,
                      letterSpacing: -0.3,
                    }}
                  >
                    Entrar
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
          </View>

          {/* Rodapé */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                color: colors.inkSoft,
                fontSize: 14,
              }}
            >
              Não tem conta?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('PrimeiroAcessoScreen', {})}>
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  color: colors.brand.primary,
                  fontSize: 14,
                }}
              >
                Primeiro Acesso
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}
