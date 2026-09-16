import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { ThemeProvider } from 'stylo-native';
import { queryClient } from '../../infrastructure/query/query-client';
import { store } from '../theme/theme';

export default function RootLayout() {
  // store.set은 render 중 금지 — 시스템 컬러 스킴 동기화는 effect 안에서만.
  useEffect(() => {
    store.set(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      store.set(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider store={store}>
        <Stack screenOptions={{ headerShown: true }} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
