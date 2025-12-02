import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WalletGeneratorPage from '../page';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  )
}));

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

describe('WalletGeneratorPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (navigator.clipboard.writeText as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render initial state', () => {
    render(<WalletGeneratorPage />);

    expect(screen.getByText('XL1 Wallet Generator')).toBeInTheDocument();
    expect(screen.getByText('Generate Mnemonic Seed Phrase')).toBeInTheDocument();
    expect(screen.getByText('Generate New Mnemonic')).toBeInTheDocument();
    // Text appears in both the empty state and instructions, so use getAllByText
    const emptyStateTexts = screen.getAllByText(/Click "Generate Mnemonic" to create a new 24-word seed phrase/i);
    expect(emptyStateTexts.length).toBeGreaterThan(0);
  });

  it('should generate mnemonic successfully', async () => {
    const mockMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        mnemonic: mockMnemonic,
        address: mockAddress
      })
    });

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    // Button should show loading state
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('/api/wallet/generate-mnemonic');
    });

    // Wait for state update
    await waitFor(() => {
      expect(screen.getByText(mockMnemonic)).toBeInTheDocument();
    });

    expect(screen.getByText(mockAddress)).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Security Warning/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep this mnemonic secure/i)).toBeInTheDocument();
    expect(screen.getByText('24-Word Mnemonic')).toBeInTheDocument();
  });

  it('should display error when API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should display error when API returns error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: 'Failed to generate mnemonic'
      })
    });

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to generate mnemonic')).toBeInTheDocument();
  });

  it('should copy mnemonic to clipboard', async () => {
    const mockMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        mnemonic: mockMnemonic,
        address: mockAddress
      })
    });

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(mockMnemonic)).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByText('Copy');
    const mnemonicCopyButton = copyButtons[0]; // First copy button (mnemonic)
    fireEvent.click(mnemonicCopyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMnemonic);
    // Both buttons will show "✓ Copied" since they share the same state
    const copiedButtons = screen.getAllByText('✓ Copied');
    expect(copiedButtons.length).toBeGreaterThan(0);
  });

  it('should copy environment variable to clipboard', async () => {
    const mockMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        mnemonic: mockMnemonic,
        address: mockAddress
      })
    });

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(mockMnemonic)).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByText('Copy');
    const envCopyButton = copyButtons[1]; // Second copy button (env variable)
    fireEvent.click(envCopyButton);

    const expectedEnvLine = `XYO_WALLET_MNEMONIC="${mockMnemonic}"`;
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedEnvLine);
  });

  it('should display environment variable format correctly', async () => {
    const mockMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        mnemonic: mockMnemonic,
        address: mockAddress
      })
    });

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/XYO_WALLET_MNEMONIC=/i)).toBeInTheDocument();
    });

    const envVariable = screen.getByText(new RegExp(`XYO_WALLET_MNEMONIC="${mockMnemonic}"`));
    expect(envVariable).toBeInTheDocument();
  });

  it('should reset state when generating new mnemonic', async () => {
    const mockMnemonic = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        mnemonic: mockMnemonic,
        address: mockAddress
      })
    });

    render(<WalletGeneratorPage />);

    // Generate first mnemonic
    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(mockMnemonic)).toBeInTheDocument();
    });

    // Click copy to set copied state
    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);
    const copiedButtons = screen.getAllByText('✓ Copied');
    expect(copiedButtons.length).toBeGreaterThan(0);

    // Generate again - should reset
    fireEvent.click(generateButton);

    // Should show loading state
    expect(screen.getByText('Generating...')).toBeInTheDocument();

    // Wait for new mnemonic
    await waitFor(() => {
      expect(screen.getByText(mockMnemonic)).toBeInTheDocument();
    });

    // Copied state should be reset (may take a moment)
    await waitFor(() => {
      const copiedButtons = screen.queryAllByText('✓ Copied');
      expect(copiedButtons.length).toBe(0);
    }, { timeout: 3000 });
  });

  it('should disable generate button while generating', async () => {
    let resolveFetch: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    // Button should be disabled
    expect(generateButton).toBeDisabled();
    expect(screen.getByText('Generating...')).toBeInTheDocument();

    // Resolve the promise
    resolveFetch!({
      json: async () => ({
        success: true,
        mnemonic: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24',
        address: '0x1234567890abcdef1234567890abcdef12345678'
      })
    });

    await waitFor(() => {
      expect(generateButton).not.toBeDisabled();
    });
  });

  it('should call API endpoint for mnemonic generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        mnemonic: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24',
        address: '0x1234567890abcdef1234567890abcdef12345678'
      })
    });

    render(<WalletGeneratorPage />);

    const generateButton = screen.getByText('Generate Mnemonic');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('/api/wallet/generate-mnemonic');
    });
  });
});

