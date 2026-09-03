import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

// Tipagem do que o contexto oferece
interface LoadingContextData {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextData>({} as LoadingContextData);

/**
 * O overlay é uma View absoluta, não um <Modal>, de propósito.
 *
 * Com <Modal>, fechar o loading e abrir o alerta (AlertContext, que também é
 * <Modal>) caía no mesmo commit do React — as duas chamadas acontecem no
 * mesmo handler e o React agrupa os setState. O iOS recebia "desmonta A" e
 * "apresenta B" no mesmo frame, engolia a apresentação de B e ainda podia
 * deixar A preso na hierarquia, travando o toque na tela inteira.
 *
 * Como View absoluta não participa da apresentação de modal do UIKit, a
 * corrida deixa de existir. Limitação: não cobre um <Modal> aberto pela
 * tela. Hoje só PrimeiroAcessoScreen usa `showLoading` e ela não tem modal
 * próprio — se isso mudar, revisar aqui.
 */
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
      <View style={styles.root}>
        {children}

        {visible && (
          <View
            style={styles.overlay}
            accessibilityViewIsModal
            accessibilityLabel={message}
          >
            <View style={styles.container}>
              <ActivityIndicator size="large" color={colors.edu.dark} />
              <Text style={styles.text}>{message}</Text>
            </View>
          </View>
        )}
      </View>
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
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  container: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
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
    color: colors.edu.text,
    textAlign: 'center'
  }
});
