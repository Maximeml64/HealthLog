// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from './src/stores/useAppStore';
import RootNavigator from './src/navigation/RootNavigator';
import { ensurePhotoDir } from './src/services/PhotoService';

export default function App() {
  const loadAll = useAppStore((s) => s.loadAll);

  useEffect(() => {
    ensurePhotoDir();
    loadAll();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootNavigator />
    </NavigationContainer>
  );
}
