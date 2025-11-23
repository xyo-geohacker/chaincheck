import React, { useRef } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureUri: string) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIGNATURE_WIDTH = SCREEN_WIDTH - 40;
const SIGNATURE_HEIGHT = 200;

export function SignatureCapture({ visible, onClose, onSave }: Props) {
  const signatureRef = useRef<any>(null);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleSave = () => {
    signatureRef.current?.readSignature();
  };

  const handleOK = (signature: string) => {
    // signature is base64 string
    const signatureUri = `data:image/png;base64,${signature}`;
    onSave(signatureUri);
    handleClear();
  };

  const style = `
    body,html {
      margin: 0;
      padding: 0;
      width: ${SIGNATURE_WIDTH}px;
      height: ${SIGNATURE_HEIGHT}px;
    }
    .m-signature-pad {
      position: absolute;
      width: ${SIGNATURE_WIDTH}px;
      height: ${SIGNATURE_HEIGHT}px;
      background-color: #FFFFFF;
      border-radius: 8px;
    }
    .m-signature-pad--body {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      border-radius: 8px;
    }
    .m-signature-pad--body canvas {
      position: absolute;
      left: 0;
      top: 0;
      width: ${SIGNATURE_WIDTH}px;
      height: ${SIGNATURE_HEIGHT}px;
      border-radius: 8px;
    }
    .m-signature-pad--footer {
      display: none;
    }
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Capture Signature</Text>
          <Text style={styles.subtitle}>Please sign to confirm delivery receipt</Text>
        </View>

        <View style={styles.signatureContainer}>
          <View style={styles.signaturePad}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleOK}
              descriptionText=""
              clearText=""
              confirmText=""
              webStyle={style}
              backgroundColor="#FFFFFF"
              penColor="#000000"
              minWidth={2}
              maxWidth={3}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                width: SIGNATURE_WIDTH,
                height: SIGNATURE_HEIGHT
              }}
            />
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Signature</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  signatureContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  signaturePad: {
    width: SIGNATURE_WIDTH,
    height: SIGNATURE_HEIGHT,
    borderWidth: 2,
    borderColor: '#3a2c6f',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  controls: {
    padding: 20,
    backgroundColor: '#111025',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27204d',
    gap: 12
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2f2862',
    borderWidth: 1,
    borderColor: '#4a3f8b',
    alignItems: 'center'
  },
  clearButtonText: {
    color: '#d7dcff',
    fontSize: 14,
    fontWeight: '600'
  },
  saveButton: {
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
  saveButtonText: {
    color: '#f9f9ff',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#8EA8FF',
    fontSize: 14,
    fontWeight: '500'
  }
});
