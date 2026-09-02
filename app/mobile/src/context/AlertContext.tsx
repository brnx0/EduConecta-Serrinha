import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

// --- CONFIGURAÇÕES E TIPOS ---
type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertContextData {
  showAlert: (title: string, message: string, type?: AlertType) => void;
  showToast: (message: string, type?: AlertType) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  setLoading: (visible: boolean, title?: string) => void;
}

const LOADING_PHRASES = [
  "Esquentando o café...",
  "Limpando a louça...",
  "Organizando os livros...",
  "Apagando o quadro...",
  "Preparando a lição...",
  "Afiando os lápis...",
  "Corrigindo os testes..."
];

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export function AlertProvider({ children }: { children: ReactNode }) {
  // --- ESTADOS DO MODAL (Alert + Confirm) ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'alert' | 'confirm'>('alert');
  const [modalData, setModalData] = useState({ title: '', message: '', type: 'info' as AlertType });
  const onConfirmRef = useRef<(() => void) | null>(null);

  // --- ESTADOS DO LOADING DINÂMICO ---
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [title, setTitle] = useState( 'Carregando...' );
  const [currentPhrase, setCurrentPhrase] = useState(LOADING_PHRASES[0]);

  // --- ESTADOS DO TOAST ---
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({ message: '', type: 'success' as AlertType });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-50)).current;

  // --- LÓGICA DE TROCA DE FRASES (LOADING) ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loadingVisible) {
      interval = setInterval(() => {
        setCurrentPhrase((prev) => {
          const currentIndex = LOADING_PHRASES.indexOf(prev);
          const nextIndex = (currentIndex + 1) % LOADING_PHRASES.length;
          return LOADING_PHRASES[nextIndex];
        });
      }, 2500); // Troca a cada 2.5 segundos
    } else {
      setCurrentPhrase(LOADING_PHRASES[0]); // Reseta para a primeira frase ao fechar
    }
    return () => clearInterval(interval);
  }, [loadingVisible]);

  // --- FUNÇÕES DE CONTROLO ---

  function setLoading(visible: boolean, title: string='Carregando...') {
    setTitle(title);
    setLoadingVisible(visible);
  }

  function showAlert(title: string, message: string, type: AlertType = 'info') {
    setModalData({ title, message, type });
    setModalMode('alert');
    setModalVisible(true);
  }

  function showConfirm(title: string, message: string, onConfirm: () => void) {
    setModalData({ title, message, type: 'warning' });
    setModalMode('confirm');
    onConfirmRef.current = onConfirm;
    setModalVisible(true);
  }

  function showToast(message: string, type: AlertType = 'success') {
    setToastConfig({ message, type });
    setToastVisible(true);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(toastTranslateY, { toValue: 50, duration: 300, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(toastTranslateY, { toValue: -50, duration: 300, useNativeDriver: true })
      ]).start(() => setToastVisible(false));
    }, 3000);
  }

  function handleConfirmAction() {
    if (onConfirmRef.current) onConfirmRef.current();
    setModalVisible(false);
  }

  // Auxiliar de Cores
  const getColors = (type: AlertType) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-700', btn: 'bg-emerald-600', icon: '#059669', iconName: 'check-circle' };
      case 'error': return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700', btn: 'bg-red-600', icon: '#dc2626', iconName: 'alert-circle' };
      case 'warning': return { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-700', btn: 'bg-amber-600', icon: '#d97706', iconName: 'alert-triangle' };
      default: return { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', btn: 'bg-blue-600', icon: '#2563eb', iconName: 'info' };
    }
  };

  const modalColors = getColors(modalData.type);
  const toastColors = getColors(toastConfig.type);

  return (
    <AlertContext.Provider value={{ showAlert, showToast, showConfirm, setLoading }}>
      {children}

      {/* --- MODAL DE LOADING DINÂMICO --- */}
      <Modal transparent visible={loadingVisible} animationType="fade">
        <View style={styles.overlay}>
          <View className="bg-white p-8 rounded-3xl items-center shadow-2xl w-10/12 border border-slate-100">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-[2px]">
             {title}
            </Text>
            <Text className="mt-2 text-slate-700 text-lg font-medium text-center">
              {currentPhrase}
            </Text>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE ALERTA E CONFIRMAÇÃO --- */}
      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View className="bg-white w-10/12 rounded-2xl p-6 shadow-xl items-center">
            <View className={`p-4 rounded-full mb-4 ${modalColors.bg}`}>
              <Feather name={modalColors.iconName as any} size={32} color={modalColors.icon} />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-2 text-center">{modalData.title}</Text>
            <Text className="text-slate-500 text-center mb-6 leading-5">{modalData.message}</Text>
            <View className="flex-row w-full gap-3 justify-center">
              {modalMode === 'confirm' && (
                <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 bg-slate-200 py-3 rounded-xl items-center">
                  <Text className="text-slate-600 font-bold">Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={modalMode === 'confirm' ? handleConfirmAction : () => setModalVisible(false)} 
                className={`flex-1 py-3 rounded-xl items-center ${modalColors.btn}`}
              >
                <Text className="text-white font-bold">{modalMode === 'confirm' ? 'Confirmar' : 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- TOAST --- */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity, transform: [{ translateY: toastTranslateY }] }]}>
          <View className={`flex-row items-center p-4 rounded-xl shadow-lg border-l-4 ${toastColors.bg} ${toastColors.border} bg-white`}>
            <Feather name={toastColors.iconName as any} size={24} color={toastColors.icon} />
            <View className="ml-3 flex-1">
               <Text className={`font-bold text-base ${toastColors.text}`}>
                 {toastConfig.type === 'error' ? 'Atenção' : toastConfig.type === 'success' ? 'Sucesso' : 'Aviso'}
               </Text>
               <Text className="text-slate-600 text-sm">{toastConfig.message}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert deve ser usado dentro de um AlertProvider');
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute', top: 0, left: 20, right: 20, zIndex: 9999
  }
});