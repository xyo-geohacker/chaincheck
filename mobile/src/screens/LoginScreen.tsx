import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import type { RootStackParamList } from '../navigation/types';
import { useDriverStore } from '@store/useDriverStore';
import { apiClient } from '../services/api.service';
import { colors } from '../theme/colors';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [driverId, setDriverId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { driverId: savedDriverId, token: savedToken, setDriverId: persistDriverId, setToken: persistToken } = useDriverStore();

  useEffect(() => {
    // If user has both driverId and token, they're already authenticated
    if (savedDriverId && savedToken) {
      navigation.replace('ActiveDeliveries');
    }
  }, [savedDriverId, savedToken, navigation]);

  const handleLogin = async () => {
    const trimmedId = driverId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedId || !trimmedPassword) {
      setError('Driver ID and password are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line no-console
      console.log('Attempting login with:', { driverId: trimmedId, hasPassword: Boolean(trimmedPassword) });
      
      const response = await apiClient.post('/api/auth/login', {
        driverId: trimmedId,
        password: trimmedPassword
      });

      // eslint-disable-next-line no-console
      console.log('Login response:', response.data);

      if (response.data.success) {
        const { driverId: responseDriverId, token } = response.data;
        
        if (!token) {
          setError('Authentication token not received. Please try again.');
          return;
        }

        // Store driver ID and token
        persistDriverId(responseDriverId || trimmedId);
        persistToken(token);
        
        // eslint-disable-next-line no-console
        console.log('JWT token stored, navigating to ActiveDeliveries');
        
        navigation.replace('ActiveDeliveries');
      } else {
        setError('Invalid driver ID or password');
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('Login error:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err && typeof err === 'object') {
        // Check for network errors (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)
        if ('code' in err) {
          const networkError = err as { code?: string; message?: string };
          if (networkError.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to server. Please check that the backend is running and EXPO_PUBLIC_API_URL is configured correctly.';
          } else if (networkError.code === 'ENOTFOUND' || networkError.code === 'ETIMEDOUT') {
            errorMessage = 'Network error. Please check your internet connection and API URL configuration.';
          } else if (networkError.message) {
            errorMessage = `Network error: ${networkError.message}`;
          }
        }
        // Check for axios response errors
        else if ('response' in err) {
          const axiosError = err as { response?: { data?: { error?: string }; status?: number } };
          if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error;
          } else if (axiosError.response?.status === 401) {
            errorMessage = 'Invalid driver ID or password';
          } else if (axiosError.response?.status === 400) {
            errorMessage = 'Driver ID and password are required';
          } else if (axiosError.response?.status) {
            errorMessage = `Server error (${axiosError.response.status})`;
          }
        }
        // Check for generic error messages
        else if ('message' in err) {
          errorMessage = (err as { message: string }).message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        {/* <Text style={styles.title}>ChainCheck</Text>
        <View style={styles.brandRow}>
          <Text style={styles.brandLabel}>Powered by</Text>
          <Image source={require('../../assets/xyo-network-logo-color.png')} style={styles.brandLogo} resizeMode="contain" />
        </View> */}
        <Image source={require('../../assets/cc-text-trans-002.png')} style={styles.logoImage} resizeMode="contain" />

        <TextInput
          style={styles.input}
          placeholder="Driver ID"
          placeholderTextColor={colors.text.placeholder}
          value={driverId}
          onChangeText={(text) => {
            setDriverId(text);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.text.placeholder}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          onPress={handleLogin}
          activeOpacity={0.85}
          style={[
            styles.signInButton,
            (driverId.trim().length === 0 || password.trim().length === 0 || isLoading)
              ? styles.signInButtonDisabled
              : undefined
          ]}
          disabled={driverId.trim().length === 0 || password.trim().length === 0 || isLoading}
        >
          <Text style={styles.signInText}>{isLoading ? 'Signing In...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    padding: 28,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.border.card,
    shadowColor: colors.purple.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.accent
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0
  },
  brandLabel: {
    fontSize: 13,
    letterSpacing: 2,
    color: '#6C80F2',
    textTransform: 'uppercase'
  },
  brandLogo: {
    height: 18,
    width: 120,
    marginLeft: -16
  },
  logoImage: {
    width: '100%',
    height: 80,
    alignSelf: 'center',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.background.input
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: -8,
    marginBottom: 4
  },
  signInButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.button.primary,
    shadowColor: colors.button.primaryShadow,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  signInButtonDisabled: {
    backgroundColor: colors.button.disabled,
    shadowOpacity: 0
  },
  signInText: {
    color: colors.button.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5
  }
});

