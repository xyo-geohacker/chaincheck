import React, { useRef } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { colors } from '../theme/colors';

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
    backgroundColor: colors.background.primary
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.background.header,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.accent
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
    borderColor: colors.border.primary,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  controls: {
    padding: 20,
    backgroundColor: colors.background.header,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.primary,
    gap: 12
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.button.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center'
  },
  clearButtonText: {
    color: colors.button.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.button.primary,
    alignItems: 'center',
    shadowColor: colors.button.primaryShadow,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  saveButtonText: {
    color: colors.button.text,
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: colors.text.accent,
    fontSize: 14,
    fontWeight: '500'
  }
});
