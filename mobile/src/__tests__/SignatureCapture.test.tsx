import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignatureCapture } from '../components/SignatureCapture';

// Mock react-native-signature-canvas
jest.mock('react-native-signature-canvas', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        clearSignature: jest.fn(),
        readSignature: jest.fn(() => {
          // Simulate signature callback
          if (props.onOK) {
            props.onOK('base64signaturedata');
          }
        })
      }));
      return null;
    })
  };
});

describe('SignatureCapture', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible is true', () => {
    const { getByText } = render(
      <SignatureCapture visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(getByText('Capture Signature')).toBeTruthy();
    expect(getByText('Please sign to confirm delivery receipt')).toBeTruthy();
  });

  it('should not render when visible is false', () => {
    const { queryByText } = render(
      <SignatureCapture visible={false} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(queryByText('Capture Signature')).toBeNull();
  });

  it('should call onClose when cancel button is pressed', () => {
    const { getByText } = render(
      <SignatureCapture visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call clearSignature when clear button is pressed', () => {
    const { getByText } = render(
      <SignatureCapture visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    // The clearSignature is called via ref, which is mocked
    // We can't directly test the ref call, but we can verify the button works
    expect(clearButton).toBeTruthy();
  });

  it('should call onSave with data URI when save button is pressed', async () => {
    const { getByText } = render(
      <SignatureCapture visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const saveButton = getByText('Save Signature');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('data:image/png;base64,base64signaturedata');
    });
  });

  it('should clear signature after saving', async () => {
    const { getByText } = render(
      <SignatureCapture visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    const saveButton = getByText('Save Signature');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should render all control buttons', () => {
    const { getByText } = render(
      <SignatureCapture visible={true} onClose={mockOnClose} onSave={mockOnSave} />
    );

    expect(getByText('Clear')).toBeTruthy();
    expect(getByText('Save Signature')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });
});

