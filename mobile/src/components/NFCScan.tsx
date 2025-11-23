import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform, Image } from 'react-native';
// Note: react-native-nfc-manager needs to be installed: npm install react-native-nfc-manager
// For Expo, you may need to use a development build or eject to use native modules
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { record1: string; serialNumber: string }) => void;
};

export function NFCScan({ visible, onClose, onSave }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedData, setScannedData] = useState<{ record1: string; serialNumber: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorData, setErrorData] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      checkNFCSupport();
    }
  }, [visible]);

  const checkNFCSupport = async () => {
    try {
      // Initialize NFC Manager
      await NfcManager.start();
      const supported = await NfcManager.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        const enabled = await NfcManager.isEnabled();
        setHasPermission(enabled);
      }
    } catch (error) {
      console.error('Error checking NFC support:', error);
      setIsSupported(false);
    }
  };

  const requestNFCPermission = async () => {
    try {
      // Request NFC to be enabled (opens settings on Android)
      await NfcManager.goToNfcSetting();
      // Re-check after user returns
      const enabled = await NfcManager.isEnabled();
      setHasPermission(enabled);
    } catch (error) {
      console.error('Error requesting NFC permission:', error);
      setErrorData({
        title: 'NFC Permission',
        message: 'NFC access is required to scan driver cards. Please enable NFC in device settings.'
      });
      setShowError(true);
    }
  };

  const handleScan = async () => {
    if (!isSupported) {
      setErrorData({
        title: 'NFC Not Supported',
        message: 'Your device does not support NFC scanning.'
      });
      setShowError(true);
      return;
    }

    if (!hasPermission) {
      await requestNFCPermission();
      return;
    }

    setIsScanning(true);

    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Read NDEF tag
      const tag = await NfcManager.getTag();
      
      if (!tag) {
        setIsScanning(false);
        await NfcManager.cancelTechnologyRequest();
        setErrorData({
          title: 'Scan Failed',
          message: 'Could not read XYO SentinelX NFC card. Please try again.'
        });
        setShowError(true);
        return;
      }

      // Parse NFC data
      // NFC tags typically contain NDEF records
      // We'll look for Record 1 and Serial Number in the tag data
      let record1 = '';
      let serialNumber = '';

      // Extract serial number from tag ID (UID)
      if (tag.id) {
        // Convert byte array to hex string
        const idBytes = Array.isArray(tag.id) ? tag.id : [tag.id];
        serialNumber = (idBytes as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      }

      // Try to extract data from NDEF records
      if (tag.ndefMessage && Array.isArray(tag.ndefMessage)) {
        for (const record of tag.ndefMessage) {
          if (record.payload) {
            const payloadData = Array.isArray(record.payload) ? record.payload : [record.payload];
            // Try to decode payload (may be UTF-8 text or binary)
            try {
              // Skip first byte (TNF/Type Length) and decode as UTF-8
              const textBytes = payloadData.slice(1);
              const text = String.fromCharCode(...textBytes);
              
              // Look for Record 1 pattern
              if (text.includes('Record 1') || text.includes('record1') || text.includes('RECORD1')) {
                record1 = text;
              }
              // Look for Serial Number pattern
              if (text.includes('Serial') || text.includes('serial') || text.includes('SERIAL')) {
                const serialMatch = text.match(/serial[:\s]*([^\s\n]+)/i);
                if (serialMatch && serialMatch[1]) {
                  serialNumber = serialMatch[1];
                }
              }
              
              // If no specific pattern found, use first record as Record 1
              if (!record1 && text.trim().length > 0) {
                record1 = text.trim();
              }
            } catch {
              // If not text, try as hex string
              const hexString = payloadData
                .map((b: number) => b.toString(16).padStart(2, '0'))
                .join('');
              if (hexString.length > 0 && !record1) {
                record1 = hexString;
              }
            }
          }
        }
      }

      // If Record 1 not found, use tag ID as fallback
      if (!record1 && serialNumber) {
        record1 = serialNumber;
      }

      // Ensure we have both values
      if (!record1) {
        record1 = serialNumber || 'N/A';
      }
      if (!serialNumber) {
        serialNumber = tag.id ? (Array.isArray(tag.id) ? tag.id.map((b: number) => b.toString(16).padStart(2, '0')).join('').toUpperCase() : String(tag.id)) : 'N/A';
      }

      // Stop NFC session
      await NfcManager.cancelTechnologyRequest();

      setIsScanning(false);

      // Store scanned data and show confirmation modal
      setScannedData({ record1, serialNumber });
      setShowConfirmation(true);
    } catch (error) {
      setIsScanning(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('NFC scan error:', error);
      
      if (errorMessage.includes('User cancelled') || errorMessage.includes('cancel')) {
        // User cancelled - just close
        onClose();
      } else {
        setErrorData({
          title: 'Scan Error',
          message: `Failed to scan XYO SentinelX NFC card: ${errorMessage}`
        });
        setShowError(true);
      }
      
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch {
        // Ignore cancel errors
      }
    }
  };

  const handleClose = async () => {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignore errors when closing
    }
    setIsScanning(false);
    setScannedData(null);
    setShowConfirmation(false);
    onClose();
  };

  const handleSave = () => {
    if (scannedData) {
      onSave(scannedData);
      setScannedData(null);
      setShowConfirmation(false);
      onClose();
    }
  };

  const handleCancelConfirmation = () => {
    setScannedData(null);
    setShowConfirmation(false);
  };

  const handleCloseError = () => {
    setShowError(false);
    setErrorData(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {
        // Ignore cleanup errors
      });
    };
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Driver</Text>
          <Text style={styles.subtitle}>Scan XYO SentinelX NFC card to verify driver identity</Text>
        </View>

        <View style={styles.content}>
          {isSupported === null ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#705cf6" />
              <Text style={styles.statusText}>Checking NFC support...</Text>
            </View>
          ) : !isSupported ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>NFC Not Supported</Text>
              <Text style={styles.errorSubtext}>
                Your device does not support NFC scanning. NFC is required to verify driver identity.
              </Text>
            </View>
          ) : !hasPermission ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>NFC Permission Required</Text>
              <Text style={styles.errorSubtext}>
                Please enable NFC in your device settings to scan driver cards.
              </Text>
              <TouchableOpacity style={styles.enableButton} onPress={requestNFCPermission}>
                <Text style={styles.enableButtonText}>Enable NFC</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centerContent}>
              {isScanning ? (
                <>
                  <ActivityIndicator size="large" color="#705cf6" />
                  <Text style={styles.statusText}>Scanning...</Text>
                  <Text style={styles.instructionText}>
                    Hold the XYO SentinelX NFC card near the back of your device
                  </Text>
                </>
              ) : (
                <>
                  <Image
                    source={require('../../assets/xyo-sentinelx-nfc.png')}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.instructionText}>
                    Tap the button below and hold the XYO SentinelX NFC card near the back of your device
                  </Text>
                  <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
                    <Text style={styles.scanButtonText}>Start Scan</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelConfirmation}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <View style={styles.successIconContainer}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.confirmationTitle}>XYO SentinelX Scanned</Text>
              <Text style={styles.confirmationSubtitle}>
                XYO SentinelX user record and serial read successfully
              </Text>
            </View>

            <View style={styles.confirmationControls}>
              <TouchableOpacity
                style={styles.confirmationSaveButton}
                onPress={handleSave}
              >
                <Text style={styles.confirmationSaveButtonText}>Save driver data?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmationCancelButton}
                onPress={handleCancelConfirmation}
              >
                <Text style={styles.confirmationCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showError}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseError}
      >
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <View style={styles.errorIconContainer}>
                <Text style={styles.errorIcon}>✗</Text>
              </View>
              <Text style={styles.confirmationTitle}>
                {errorData?.title || 'Error'}
              </Text>
              <Text style={styles.confirmationSubtitle}>
                {errorData?.message || 'An error occurred'}
              </Text>
            </View>

            <View style={styles.confirmationControls}>
              <TouchableOpacity
                style={styles.confirmationSaveButton}
                onPress={handleCloseError}
              >
                <Text style={styles.confirmationSaveButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060F'
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#111025',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27204d'
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F7F8FD',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#8EA8FF'
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerContent: {
    alignItems: 'center',
    gap: 16
  },
  statusText: {
    fontSize: 16,
    color: '#F7F8FD',
    marginTop: 12
  },
  cardImage: {
    width: 200,
    height: 120,
    marginBottom: 24,
    opacity: 0.5,
    alignSelf: 'center'
  },
  instructionText: {
    fontSize: 15,
    color: '#8EA8FF',
    textAlign: 'center',
    marginBottom: 24
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F7F8FD',
    marginBottom: 8
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8EA8FF',
    textAlign: 'center',
    marginBottom: 16
  },
  scanButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: '#705cf6',
    alignItems: 'center',
    shadowColor: '#3c2fb0',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  scanButtonText: {
    color: '#f9f9ff',
    fontSize: 16,
    fontWeight: '600'
  },
  enableButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2f2862',
    borderWidth: 1,
    borderColor: '#4a3f8b',
    alignItems: 'center'
  },
  enableButtonText: {
    color: '#d7dcff',
    fontSize: 14,
    fontWeight: '600'
  },
  controls: {
    padding: 20,
    backgroundColor: '#111025',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27204d'
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#8EA8FF',
    fontSize: 14,
    fontWeight: '500'
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  confirmationModal: {
    backgroundColor: '#111025',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#27204d',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10
  },
  confirmationHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27204d'
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
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F7F8FD',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  confirmationSubtitle: {
    fontSize: 14,
    color: '#8EA8FF',
    textAlign: 'center',
    lineHeight: 20
  },
  confirmationControls: {
    padding: 20,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27204d'
  },
  confirmationSaveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#705cf6',
    alignItems: 'center',
    shadowColor: '#3c2fb0',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  confirmationSaveButtonText: {
    color: '#f9f9ff',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmationCancelButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  confirmationCancelButtonText: {
    color: '#8EA8FF',
    fontSize: 14,
    fontWeight: '500'
  }
});

