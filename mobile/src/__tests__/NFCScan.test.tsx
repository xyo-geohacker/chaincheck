import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NFCScan } from '../components/NFCScan';
import NfcManager from 'react-native-nfc-manager';

// Mock react-native-nfc-manager
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    isSupported: jest.fn(),
    isEnabled: jest.fn(),
    goToNfcSetting: jest.fn(),
    requestTechnology: jest.fn(),
    getTag: jest.fn(),
    cancelTechnologyRequest: jest.fn()
  },
  NfcTech: {
    Ndef: 'Ndef'
  },
  Ndef: {}
}));

// Mock image asset
jest.mock('../../assets/xyo-sentinelx-nfc.png', () => 'mock-image-path');

describe('NFCScan', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (NfcManager.start as jest.Mock).mockResolvedValue(undefined);
    (NfcManager.cancelTechnologyRequest as jest.Mock).mockResolvedValue(undefined);
  });

  it('should render when visible is true', () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(getByText('Verify Driver')).toBeTruthy();
  });

  it('should check NFC support on mount when visible', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);

    render(<NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(NfcManager.start).toHaveBeenCalled();
      expect(NfcManager.isSupported).toHaveBeenCalled();
    });
  });

  it('should show loading state while checking NFC support', async () => {
    (NfcManager.isSupported as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(true), 100))
    );
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(getByText('Checking NFC support...')).toBeTruthy();
  });

  it('should show error when NFC is not supported', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(false);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('NFC Not Supported')).toBeTruthy();
    });
  });

  it('should show permission request when NFC is not enabled', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(false);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('NFC Permission Required')).toBeTruthy();
      expect(getByText('Enable NFC')).toBeTruthy();
    });
  });

  it('should request NFC permission when enable button is pressed', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(false);
    (NfcManager.goToNfcSetting as jest.Mock).mockResolvedValue(undefined);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('Enable NFC')).toBeTruthy();
    });

    const enableButton = getByText('Enable NFC');
    fireEvent.press(enableButton);

    await waitFor(() => {
      expect(NfcManager.goToNfcSetting).toHaveBeenCalled();
    });
  });

  it('should start scanning when scan button is pressed', async () => {
    const mockTag = {
      id: [0x01, 0x02, 0x03, 0x04],
      ndefMessage: [
        {
          payload: [0x02, 0x65, 0x6e, 0x52, 0x65, 0x63, 0x6f, 0x72, 0x64, 0x20, 0x31]
        }
      ]
    };

    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);
    (NfcManager.requestTechnology as jest.Mock).mockResolvedValue(undefined);
    (NfcManager.getTag as jest.Mock).mockResolvedValue(mockTag);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('Start Scan')).toBeTruthy();
    });

    const scanButton = getByText('Start Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(NfcManager.requestTechnology).toHaveBeenCalled();
      expect(NfcManager.getTag).toHaveBeenCalled();
    });
  });

  it('should show confirmation modal after successful scan', async () => {
    const mockTag = {
      id: [0x01, 0x02, 0x03, 0x04],
      ndefMessage: []
    };

    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);
    (NfcManager.requestTechnology as jest.Mock).mockResolvedValue(undefined);
    (NfcManager.getTag as jest.Mock).mockResolvedValue(mockTag);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('Start Scan')).toBeTruthy();
    });

    const scanButton = getByText('Start Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(getByText('XYO SentinelX Scanned')).toBeTruthy();
    });
  });

  it('should call onSave when confirmation save button is pressed', async () => {
    const mockTag = {
      id: [0x01, 0x02, 0x03, 0x04],
      ndefMessage: []
    };

    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);
    (NfcManager.requestTechnology as jest.Mock).mockResolvedValue(undefined);
    (NfcManager.getTag as jest.Mock).mockResolvedValue(mockTag);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('Start Scan')).toBeTruthy();
    });

    const scanButton = getByText('Start Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(getByText('Save driver data?')).toBeTruthy();
    });

    const saveButton = getByText('Save driver data?');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle scan errors gracefully', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);
    (NfcManager.requestTechnology as jest.Mock).mockRejectedValue(
      new Error('Scan failed')
    );

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('Start Scan')).toBeTruthy();
    });

    const scanButton = getByText('Start Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(getByText(/Scan Error|Error/)).toBeTruthy();
    });
  });

  it('should call onClose when cancel button is pressed', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    // Wait for NFC support check to complete
    await waitFor(() => {
      expect(NfcManager.isSupported).toHaveBeenCalled();
    });

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    // handleClose is async, so wait for it
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should cancel NFC request on close', async () => {
    (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
    (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(
      <NFCScan visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(NfcManager.cancelTechnologyRequest).toHaveBeenCalled();
    });
  });
});

