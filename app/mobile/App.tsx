// App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Routes } from './src/routes';
import { AlertProvider } from './src/context/AlertContext';
import { LoadingProvider } from './src/context/LoadingContext';
import { AlunoProvider } from './src/context/AlunoContext';
import { colors } from './src/constants/colors';

export default function App() {
  return (
    <>
      <AlertProvider>
        <AlunoProvider>
          <LoadingProvider>
            <StatusBar style="light" backgroundColor={colors.edu.primary} />
            <Routes />
          </LoadingProvider>
        </AlunoProvider>
      </AlertProvider>
    </>
  );
}