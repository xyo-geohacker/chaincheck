import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer, Barometer } from 'expo-sensors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Mapbox, { Camera, PointAnnotation, ShapeSource, CircleLayer } from '@rnmapbox/maps';

import type { RootStackParamList } from '@navigation/types';
import { useDriverStore } from '@store/useDriverStore';
import { LocationService } from '@services/location.service';
import { colors } from '../theme/colors';
import { XYOMobileService } from '@services/xyo.service';
import { haversineDistance } from '@utils/distance';
import { hashImageFile, hashBase64Image } from '@utils/hash.utils';
import { SignatureCapture } from '@components/SignatureCapture';
import { NFCScan } from '@components/NFCScan';

type VerifyDeliveryRouteProp = RouteProp<RootStackParamList, 'VerifyDelivery'>;
type VerifyDeliveryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerifyDelivery'>;

type Props = {
  route: VerifyDeliveryRouteProp;
  navigation: VerifyDeliveryNavigationProp;
};

const locationService = new LocationService();
const xyoService = new XYOMobileService();

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export const VerifyDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { delivery } = route.params;

  const { driverId, token, clearDriver } = useDriverStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<{ uri: string } | null>(null);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [isNfcOpen, setIsNfcOpen] = useState(false);
  const [capturedNfc, setCapturedNfc] = useState<{ record1: string; serialNumber: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [driverNotes, setDriverNotes] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [verificationData, setVerificationData] = useState<{
    proofHash: string;
    archivistStatus: string;
    success: boolean;
  } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    altitude?: number | null;
  } | null>(null);
  const [barometricPressure, setBarometricPressure] = useState<number | null>(null);
  const [barometerAvailable, setBarometerAvailable] = useState<boolean>(false);
  const [accelerometerData, setAccelerometerData] = useState<{ x: number; y: number; z: number } | null>(null);
  const [accelerometerAvailable, setAccelerometerAvailable] = useState<boolean>(false);

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (!driverId || !token) {
      navigation.replace('Login');
      return;
    }

    // Check if mock location mode is enabled
    const mockLocationEnabled = process.env.EXPO_PUBLIC_MOCK_DRIVER_LOCATION === 'true';

    if (mockLocationEnabled) {
      // Mock location mode: use delivery destination coordinates
      setCurrentLocation({
        latitude: delivery.destinationLat,
        longitude: delivery.destinationLon,
        altitude: null
      });
      setIsWithinRange(true); // Always within range in mock mode
      setIsLoading(false);
      return;
    }

    // Real GPS location mode: watch actual device location
    let subscriptionMounted = true;

    (async () => {
      try {
        const subscription = await locationService.watchLocation((location) => {
          if (!subscriptionMounted) {
            return;
          }

          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude ?? null
          });

          const distance = haversineDistance(
            location.coords.latitude,
            location.coords.longitude,
            delivery.destinationLat,
            delivery.destinationLon
          );

          setIsWithinRange(distance <= 50);
        });

        return () => {
          subscriptionMounted = false;
          subscription.remove();
        };
      } catch (error) {
        setAlertTitle('Location Error');
        setAlertMessage(error instanceof Error ? error.message : String(error));
        setShowAlertModal(true);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      subscriptionMounted = false;
    };
  }, [delivery.destinationLat, delivery.destinationLon, driverId, navigation]);

  // Initialize Mapbox access token
  useEffect(() => {
    const accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
    if (accessToken) {
      Mapbox.setAccessToken(accessToken);
    } else {
      console.warn('EXPO_PUBLIC_MAPBOX_TOKEN is not set. Map may not display correctly.');
    }
  }, []);

  // Initialize barometric pressure sensor
  useEffect(() => {
    let barometerSubscription: { remove: () => void } | null = null;

    const initializeBarometer = async () => {
      try {
        const isAvailable = await Barometer.isAvailableAsync();
        setBarometerAvailable(isAvailable);

        if (isAvailable) {
          // Set update interval to 1000ms (1 second)
          Barometer.setUpdateInterval(1000);
          
          barometerSubscription = Barometer.addListener(({ pressure }) => {
            // Pressure is in hPa (hectopascals)
            setBarometricPressure(pressure);
          });
        }
      } catch (error) {
        console.warn('Barometer not available:', error);
        setBarometerAvailable(false);
      }
    };

    initializeBarometer();

    return () => {
      if (barometerSubscription) {
        barometerSubscription.remove();
      }
    };
  }, []);

  // Initialize accelerometer sensor
  useEffect(() => {
    let accelerometerSubscription: { remove: () => void } | null = null;

    const initializeAccelerometer = async () => {
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        setAccelerometerAvailable(isAvailable);

        if (isAvailable) {
          // Set update interval to 100ms for more responsive readings
          Accelerometer.setUpdateInterval(100);
          
          accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
            // Acceleration in m/s² (meters per second squared)
            setAccelerometerData({ x, y, z });
          });
        }
      } catch (error) {
        console.warn('Accelerometer not available:', error);
        setAccelerometerAvailable(false);
      }
    };

    initializeAccelerometer();

    return () => {
      if (accelerometerSubscription) {
        accelerometerSubscription.remove();
      }
    };
  }, []);

  const mapCenter = useMemo(
    () => [delivery.destinationLon, delivery.destinationLat] as [number, number],
    [delivery.destinationLat, delivery.destinationLon]
  );

  // Generate circle GeoJSON for 50m radius
  // Note: Mapbox circleRadius is in pixels, so we approximate 50m at zoom 15
  // At zoom 15, 1 pixel ≈ 1.19 meters, so 50m ≈ 42 pixels
  const circleRadius = useMemo(() => {
    // Approximate pixel radius for 50 meters at zoom level 15
    // This is an approximation - for exact meters, you'd need to use turf.js or similar
    return 42; // pixels (approximately 50 meters at zoom 15)
  }, []);

  const handleVerifyDelivery = async () => {
    if (!capturedPhoto) {
      setAlertTitle('Photo Required');
      setAlertMessage('Capture a delivery photo before verifying.');
      setShowAlertModal(true);
      setStatusMessage('Capture a delivery photo before submitting proof.');
      setStatusType('error');
      return;
    }

    if (!currentLocation) {
      setAlertTitle('Location Unavailable');
      setAlertMessage('Current GPS location has not been determined yet.');
      setShowAlertModal(true);
      return;
    }

    if (!isWithinRange) {
      setAlertTitle('Out of Range');
      setAlertMessage('Move within 50 meters of the destination to verify delivery.');
      setShowAlertModal(true);
      return;
    }

    setIsVerifying(true);

    try {
      // Calculate SHA-256 hashes for immutable proof
      setStatusMessage('Calculating photo hash…');
      setStatusType('info');
      const photoHash = await hashImageFile(capturedPhoto.uri);
      
      let signatureHash: string | undefined;
      if (capturedSignature) {
        setStatusMessage('Calculating signature hash…');
        signatureHash = await hashBase64Image(capturedSignature);
      }

      setStatusMessage('Uploading delivery photo…');
      setStatusType('info');
      await xyoService.uploadDeliveryPhoto(delivery.id, capturedPhoto.uri);

      if (capturedSignature) {
        setStatusMessage('Uploading signature…');
        await xyoService.uploadDeliverySignature(delivery.id, capturedSignature);
      }

      setStatusMessage('Submitting location proof to XYO network…');
      const proof = await xyoService.createDeliveryProof(delivery.id, {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        timestamp: Date.now(),
        altitude: currentLocation.altitude ?? undefined,
        barometricPressure: barometricPressure ?? undefined,
        accelerometer: accelerometerData ?? undefined,
        notes: driverNotes.trim() || undefined,
        photoHash,
        signatureHash,
        nfcData: capturedNfc ? {
          record1: capturedNfc.record1,
          serialNumber: capturedNfc.serialNumber
        } : undefined
      });

      const proofHash = proof.proof?.hash ?? proof.proofHash ?? 'submitted';
      const archivistInfo = proof.proof?.archivistResponse ?? proof.archivistResponse;
      const archivistStatus = archivistInfo
        ? archivistInfo.success
          ? 'XL1 transaction posted successfully.'
          : `XL1 transaction error: ${archivistInfo.error ?? 'Unknown error'}.`
        : 'XL1 response unavailable.';

      setStatusMessage(`Delivery verified. XL1 transaction hash: ${proofHash}\n${archivistStatus}\n`);
      setStatusType('success');

      console.log('XL1 transaction response:', archivistInfo);
      
      // Show styled verification modal instead of native Alert
      setVerificationData({
        proofHash,
        archivistStatus,
        success: archivistInfo?.success ?? false
      });
      setShowVerificationModal(true);
    } catch (error) {
      // Check for 401 (Unauthorized) - token expired or invalid
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          // Token expired or invalid - clear credentials and redirect to login
          clearDriver();
          setErrorTitle('Session Expired');
          setErrorMessage('Your session has expired. Please log in again.');
          setShowErrorModal(true);
          setTimeout(() => {
            navigation.replace('Login');
          }, 2000);
          return;
        }
      }
      
      // Extract user-friendly error message
      let userMessage = 'Verification failed. Please try again.';
      let errorTitle = 'Verification Failed';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('signature')) {
          userMessage = 'Signature upload failed. Please try capturing the signature again.';
          errorTitle = 'Signature Upload Failed';
        } else if (errorMsg.includes('photo')) {
          userMessage = 'Photo upload failed. Please try capturing the photo again.';
          errorTitle = 'Photo Upload Failed';
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
          userMessage = 'Network error. Please check your connection and try again.';
          errorTitle = 'Network Error';
        } else if (errorMsg.includes('location') || errorMsg.includes('gps')) {
          userMessage = 'Location error. Please ensure GPS is enabled and try again.';
          errorTitle = 'Location Error';
        } else if (errorMsg.includes('session') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
          userMessage = 'Your session has expired. Please log in again.';
          errorTitle = 'Session Expired';
        } else if (errorMsg.includes('base64') || errorMsg.includes('bad base')) {
          userMessage = 'Signature data is invalid. Please try capturing the signature again.';
          errorTitle = 'Signature Error';
        }
      }
      
      setStatusMessage(`Verification failed`);
      setStatusType('error');
      setErrorTitle(errorTitle);
      setErrorMessage(userMessage);
      setShowErrorModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Fetching current location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street}>
        <Camera
          centerCoordinate={mapCenter}
          zoomLevel={15}
          animationMode="flyTo"
          animationDuration={2000}
        />
        
        {/* Delivery Destination Marker */}
        <PointAnnotation
          id="destination"
          coordinate={mapCenter}
        >
          <View style={styles.markerContainer}>
            <View style={[styles.marker, styles.destinationMarker]} />
            <Text style={styles.markerLabel}>Destination</Text>
          </View>
        </PointAnnotation>

        {/* Range Circle (50m radius) */}
        <ShapeSource
          id="rangeCircle"
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: mapCenter
            },
            properties: {}
          }}
        >
          <CircleLayer
            id="rangeCircleLayer"
            style={{
              circleRadius: circleRadius,
              circleColor: 'rgba(112, 92, 246, 0.18)',
              circleStrokeColor: 'rgba(112, 92, 246, 0.7)',
              circleStrokeWidth: 2
            }}
          />
        </ShapeSource>

        {/* Current Location Marker */}
        {currentLocation && (
          <PointAnnotation
            id="currentLocation"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, styles.currentLocationMarker]} />
              <Text style={styles.markerLabel}>Your Location</Text>
            </View>
          </PointAnnotation>
        )}
      </Mapbox.MapView>

      <View style={styles.controls}>
        <View style={styles.photoRow}>
        <TouchableOpacity
          onPress={openCamera}
          activeOpacity={0.85}
          style={styles.photoButton}
        >
            <Text style={styles.captureButtonText}>
              {capturedPhoto ? 'Retake photo' : 'Capture photo'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.photoStatus}>
            {capturedPhoto ? '✓ Photo captured' : 'No photo captured'}
          </Text>
        </View>

        <View style={styles.photoRow}>
          <TouchableOpacity
            onPress={() => setIsSignatureOpen(true)}
            activeOpacity={0.85}
            style={styles.photoButton}
            disabled={isVerifying}
          >
            <Text style={styles.captureButtonText}>
              {capturedSignature ? 'Resign' : 'Capture signature'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.photoStatus}>
            {capturedSignature ? '✓ Signature captured' : 'No signature captured'}
          </Text>
        </View>

        <View style={styles.photoRow}>
          <TouchableOpacity
            onPress={() => setIsNfcOpen(true)}
            activeOpacity={0.85}
            style={styles.photoButton}
            disabled={isVerifying}
          >
            <Text style={styles.captureButtonText}>
              {capturedNfc ? 'Rescan NFC' : 'Verify Driver'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.photoStatus}>
            {capturedNfc ? '✓ Driver verified' : 'No NFC scan'}
          </Text>
        </View>

        {statusMessage ? (
          <View
            style={[
              styles.statusBanner,
              statusType === 'success'
                ? styles.statusSuccess
                : statusType === 'error'
                  ? styles.statusError
                  : styles.statusInfo
            ]}
          >
            <Text
              style={[
                styles.statusBannerText,
                statusType === 'error' ? styles.statusBannerTextDark : styles.statusBannerTextLight
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Delivery Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any notes about this delivery..."
            placeholderTextColor="#6B7280"
            value={driverNotes}
            onChangeText={setDriverNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isVerifying}
          />
        </View>

        {process.env.EXPO_PUBLIC_MOCK_DRIVER_LOCATION === 'true' && (
          <View style={styles.mockLocationBanner}>
            <Text style={styles.mockLocationText}>
              🧪 Mock Location Mode: Using delivery destination coordinates
            </Text>
          </View>
        )}
        <Text style={styles.statusText}>
          {isWithinRange
            ? '✓ Within range'
            : [
                '✗ Move closer to the destination',
                currentLocation
                  ? `Current: ${formatCoordinates(currentLocation.latitude, currentLocation.longitude)}`
                  : 'Current: acquiring…',
                `Destination: ${formatCoordinates(delivery.destinationLat, delivery.destinationLon)}`
              ].join('\n')}
        </Text>

        <TouchableOpacity
          onPress={handleVerifyDelivery}
          activeOpacity={0.85}
          style={[
            styles.verifyButton,
            (!capturedPhoto || !isWithinRange || isVerifying) && styles.verifyButtonDisabled
          ]}
          disabled={isVerifying}
        >
          <Text style={styles.verifyButtonText}>{isVerifying ? 'Verifying…' : 'Verify Delivery'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isCameraOpen} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing="back" ref={cameraRef}>
            <View style={styles.cameraControls}>
              <Pressable style={styles.captureButton} onPress={takePhoto} />
            </View>
          </CameraView>
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setIsCameraOpen(false)}>
            <Text style={styles.modalDismissText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <SignatureCapture
        visible={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSave={(signatureUri) => {
          setCapturedSignature(signatureUri);
          setIsSignatureOpen(false);
        }}
      />

      <NFCScan
        visible={isNfcOpen}
        onClose={() => setIsNfcOpen(false)}
        onSave={(nfcData) => {
          setCapturedNfc(nfcData);
          setIsNfcOpen(false);
        }}
      />

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowErrorModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.verificationModal}>
            <View style={styles.verificationHeader}>
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>✗</Text>
              </View>
              <Text style={styles.verificationTitle}>{errorTitle}</Text>
              <Text style={styles.verificationSubtitle}>{errorMessage}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowErrorModal(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Generic Alert Modal */}
      <Modal
        visible={showAlertModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAlertModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.verificationModal}>
            <View style={styles.verificationHeader}>
              <View style={styles.warningIconContainer}>
                <Text style={styles.warningIcon}>⚠</Text>
              </View>
              <Text style={styles.verificationTitle}>{alertTitle}</Text>
              <Text style={styles.verificationSubtitle}>{alertMessage}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowAlertModal(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Styled Verification Success Modal */}
      {verificationData && (
        <Modal
          visible={showVerificationModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowVerificationModal(false);
            navigation.goBack();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.verificationModal}>
              <View style={styles.verificationHeader}>
                <View style={styles.successIconContainer}>
                  <Text style={styles.successIcon}>✓</Text>
                </View>
                <Text style={styles.verificationTitle}>Delivery Verified</Text>
                <Text style={styles.verificationSubtitle}>
                  Transaction successfully posted to XL1 blockchain
                </Text>
              </View>

              <View style={styles.verificationContent}>
                <View style={styles.verificationSection}>
                  <Text style={styles.verificationLabel}>XL1 Transaction Hash</Text>
                  <View style={styles.hashContainer}>
                    <Text style={styles.hashText} selectable>
                      {verificationData.proofHash}
                    </Text>
                  </View>
                </View>

                <View style={styles.verificationSection}>
                  <Text style={styles.verificationLabel}>Transaction Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      verificationData.success
                        ? styles.statusBadgeSuccess
                        : styles.statusBadgeError
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {verificationData.success ? 'Success' : 'Error'}
                    </Text>
                  </View>
                </View>

                {verificationData.archivistStatus && (
                  <View style={styles.verificationSection}>
                    <Text style={styles.verificationLabel}>Details</Text>
                    <Text style={styles.verificationDetails}>
                      {verificationData.archivistStatus}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowVerificationModal(false);
                  navigation.goBack();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  async function openCamera() {
    if (!cameraPermission) {
      const permissionResponse = await requestCameraPermission();
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        setAlertTitle('Camera Permission Required');
        setAlertMessage('Camera access is needed to capture proof photos.');
        setShowAlertModal(true);
        return;
      }
    } else if (cameraPermission.status !== 'granted') {
      const permissionResponse = await requestCameraPermission();
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        setAlertTitle('Camera Permission Required');
        setAlertMessage('Camera access is needed to capture proof photos.');
        setShowAlertModal(true);
        return;
      }
    }

    setCapturedPhoto(null);
    setIsCameraOpen(true);
  }

  async function takePhoto() {
    try {
      const photo = await cameraRef.current?.takePictureAsync();

      if (!photo?.uri) {
        throw new Error('Unable to capture photo');
      }

      setCapturedPhoto({ uri: photo.uri });
      setIsCameraOpen(false);
    } catch (error) {
      setAlertTitle('Camera Error');
      setAlertMessage(error instanceof Error ? error.message : String(error));
      setShowAlertModal(true);
    }
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  map: {
    flex: 1
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.background.header,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.primary,
    gap: 14
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  photoButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.button.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary
  },
  captureButtonText: {
    color: '#d7dcff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  photoStatus: {
    fontSize: 13,
    color: '#8EA8FF'
  },
  statusBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  statusSuccess: {
    backgroundColor: 'rgba(34,197,94,0.15)'
  },
  statusError: {
    backgroundColor: 'rgba(248,113,113,0.18)'
  },
  statusInfo: {
    backgroundColor: 'rgba(125,211,252,0.16)'
  },
  statusBannerText: {
    fontSize: 13
  },
  statusBannerTextLight: {
    color: '#f7f8fd'
  },
  statusBannerTextDark: {
    color: '#fcd9d9'
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F7F8FD'
  },
  verifyButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.button.primary,
    shadowColor: colors.button.primaryShadow,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5
  },
  verifyButtonDisabled: {
    backgroundColor: colors.button.disabled,
    shadowOpacity: 0
  },
  verifyButtonText: {
    color: colors.button.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background.primary
  },
  loadingText: {
    fontSize: 16,
    color: '#8EA8FF'
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  camera: {
    flex: 1
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center'
  },
  modalDismiss: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.header
  },
  modalDismissText: {
    color: colors.text.accent,
    fontSize: 16,
    fontWeight: '600'
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  notesContainer: {
    gap: 8
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.accent
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.input,
    minHeight: 80,
    maxHeight: 120
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#ffffff'
  },
  destinationMarker: {
    backgroundColor: '#705cf6'
  },
  currentLocationMarker: {
    backgroundColor: '#1e90ff'
  },
  markerLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#F7F8FD',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  verificationModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background.header,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    shadowColor: colors.purple.primary,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10
  },
  verificationHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  successIcon: {
    fontSize: 36,
    color: '#22c55e',
    fontWeight: '700'
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  errorIcon: {
    fontSize: 36,
    color: '#f87171',
    fontWeight: '700'
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  warningIcon: {
    fontSize: 36,
    color: '#fbbf24',
    fontWeight: '700'
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  verificationSubtitle: {
    fontSize: 14,
    color: colors.text.accent,
    textAlign: 'center',
    lineHeight: 20
  },
  verificationContent: {
    padding: 20,
    gap: 20
  },
  verificationSection: {
    gap: 8
  },
  verificationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  hashContainer: {
    backgroundColor: colors.background.input,
    borderWidth: 1,
    borderColor: colors.border.input,
    borderRadius: 12,
    padding: 14
  },
  hashText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.button.textSecondary,
    letterSpacing: 0.3
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)'
  },
  statusBadgeError: {
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    borderColor: 'rgba(248, 113, 113, 0.3)'
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary
  },
  verificationDetails: {
    fontSize: 14,
    color: colors.button.textSecondary,
    lineHeight: 20
  },
  modalButton: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.button.primary,
    shadowColor: colors.button.primaryShadow,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  modalButtonText: {
    color: colors.button.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  mockLocationBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    marginBottom: 8
  },
  mockLocationText: {
    fontSize: 12,
    color: '#fbbf24',
    fontWeight: '600',
    textAlign: 'center'
  }
});

