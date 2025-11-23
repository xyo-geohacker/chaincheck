import type { DeliveryRecord } from '@shared/types/delivery.types';

export type RootStackParamList = {
  Login: undefined;
  ActiveDeliveries: undefined;
  VerifyDelivery: {
    delivery: DeliveryRecord;
  };
};

