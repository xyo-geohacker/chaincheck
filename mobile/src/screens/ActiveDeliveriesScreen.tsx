import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import type { DeliveryRecord } from '@shared/types/delivery.types';
import type { RootStackParamList } from '@navigation/types';
import { apiClient } from '@services/api.service';
import { useDriverStore } from '@store/useDriverStore';
import { colors } from '../theme/colors';

type ActiveDeliveriesNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ActiveDeliveries'
>;

type Props = {
  navigation: ActiveDeliveriesNavigationProp;
};

export const ActiveDeliveriesScreen: React.FC<Props> = ({ navigation }) => {
  const { driverId, token, clearDriver } = useDriverStore();
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId || !token) {
      navigation.replace('Login');
    }
  }, [driverId, token, navigation]);

  const handleSignOut = useCallback(() => {
    clearDriver();
    navigation.replace('Login');
  }, [clearDriver, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: '#05060F' },
      headerTitleStyle: { color: '#F7F8FD' },
      headerTintColor: '#8EA8FF',
      headerRight: () => (
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation, handleSignOut]);

  const loadDeliveries = useCallback(
    async (showSpinner = true) => {
      if (!driverId) {
        setDeliveries([]);
        setIsLoading(false);
        return;
      }

      if (showSpinner) {
        setIsLoading(true);
      }

      try {
        // eslint-disable-next-line no-console
        console.log('Loading deliveries for driver:', driverId);
        // eslint-disable-next-line no-console
        console.log('API Base URL:', apiClient.defaults.baseURL);
        
        const response = await apiClient.get<{ deliveries: DeliveryRecord[] }>('/api/deliveries', {
          params: { driverId },
          timeout: 30000 // 30 second timeout
        });
        
        // eslint-disable-next-line no-console
        console.log('Deliveries loaded successfully:', response.data.deliveries?.length ?? 0, 'deliveries');
        setDeliveries(response.data.deliveries ?? []);
        setError(null);
      } catch (err) {
        // Check for 401 (Unauthorized) - token expired or invalid
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number } };
          if (axiosError.response?.status === 401) {
            // Token expired or invalid - clear credentials and redirect to login
            clearDriver();
            navigation.replace('Login');
            return;
          }
        }
        
        // Enhanced error message for network issues
        let errorMessage = 'Unable to load deliveries. Pull to retry.';
        if (err && typeof err === 'object' && 'code' in err) {
          const networkError = err as { code?: string; message?: string };
          if (networkError.code === 'ECONNREFUSED' || networkError.code === 'ENOTFOUND' || networkError.code === 'ETIMEDOUT') {
            errorMessage = 'Cannot connect to server. Check your network connection and API URL configuration.';
          }
        }
        
        setError(errorMessage);
        // eslint-disable-next-line no-console
        console.error('Failed to load deliveries:', err);
      } finally {
        if (showSpinner) {
          setIsLoading(false);
        }
        setIsRefreshing(false);
      }
    },
    [driverId, clearDriver, navigation]
  );

  useFocusEffect(
    useCallback(() => {
      void loadDeliveries();
    }, [loadDeliveries])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadDeliveries(false);
  };

  const sortedDeliveries = useMemo(
    () =>
      deliveries.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [deliveries]
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#8EA8FF" />
          <Text style={styles.loadingText}>Loading deliveries…</Text>
        </View>
      ) : (
        <FlatList
          data={sortedDeliveries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#0f172a" />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('VerifyDelivery', { delivery: item })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>{item.orderId}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    styles[`status_${item.status}`] ?? styles.status_DEFAULT
                  ]}
                >
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
              <Text style={styles.address}>{item.deliveryAddress}</Text>
              <Text style={styles.meta}>Recipient · {item.recipientName}</Text>
              <Text style={styles.metaMuted}>Driver · {item.driverId}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No active deliveries</Text>
              <Text style={styles.emptySubtitle}>
                {error ?? 'New assignments will appear here when they are available.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 16,
    color: '#8EA8FF'
  },
  listContent: {
    padding: 18,
    gap: 14
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border.card,
    shadowColor: colors.purple.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary
  },
  statusBadge: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  status_DELIVERED: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#22c55e'
  },
  status_IN_TRANSIT: {
    backgroundColor: 'rgba(125,211,252,0.15)',
    color: '#38bdf8'
  },
  status_PENDING: {
    backgroundColor: 'rgba(250,204,21,0.15)',
    color: '#facc15'
  },
  status_FAILED: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    color: '#f87171'
  },
  status_DISPUTED: {
    backgroundColor: 'rgba(244,114,182,0.15)',
    color: '#f472b6'
  },
  status_DEFAULT: {
    backgroundColor: 'rgba(112,92,246,0.18)',
    color: '#d7dcff'
  },
  address: {
    fontSize: 16,
    color: colors.text.secondary
  },
  meta: {
    fontSize: 14,
    color: colors.text.muted
  },
  metaMuted: {
    fontSize: 13,
    color: '#6c7393'
  },
  logoutButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: '#1b1631'
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9aaeff',
    letterSpacing: 1
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 10
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7F8FD'
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7c82a7',
    textAlign: 'center'
  }
});

