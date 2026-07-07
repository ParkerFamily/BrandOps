import { useColorScheme as useColorSchemeCore } from 'react-native';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  // RN returns only: 'light' | 'dark' | null
  return coreScheme ?? 'light';
};
