import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet } from 'react-native';

// Tipagem do que o contexto oferece
interface LoadingContextData {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextData>({} as LoadingContextData);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Carregando...');

  function showLoading(msg: string = 'Carregando...') {
    setMessage(msg);
    setVisible(true);
  }

  function hideLoading() {
    setVisible(false);
  }

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: visible }}>
      {children}

      {/* COMPONENTE VISUAL DO LOADING (MODAL) */}
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => {}} // Bloqueia o botão voltar do Android enquanto carrega
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.text}>{message}</Text>
          </View>
        </View>
      </Modal>
    </LoadingContext.Provider>
  );
}

// Hook para usar facil nas telas
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading deve ser usado dentro de um LoadingProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Fundo preto semi-transparente
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155', // Slate-700
    textAlign: 'center'
  }
});