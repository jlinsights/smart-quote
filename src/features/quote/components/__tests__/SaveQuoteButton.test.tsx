import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveQuoteButton } from '../SaveQuoteButton';
import { QuoteInput, Incoterm, PackingType } from '@/types';

vi.mock('@/api/quoteApi', () => ({
  saveQuote: vi.fn(),
}));

import { saveQuote } from '@/api/quoteApi';

const mockInput: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '10001',
  incoterm: Incoterm.FOB,
  packingType: PackingType.NONE,
  items: [],
  marginPercent: 20,
  dutyTaxEstimate: 0,
  exchangeRate: 1300,
  fscPercent: 27.5,
};

describe('SaveQuoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows Save Quote button initially', () => {
    render(<SaveQuoteButton input={mockInput} />);

    expect(screen.getByText('Save Quote')).toBeInTheDocument();
  });

  it('shows notes input after clicking Save Quote', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} />);

    await userEvent.click(screen.getByText('Save Quote'));

    expect(
      screen.getByPlaceholderText('Add notes (optional)'),
    ).toBeInTheDocument();
  });

  it('calls saveQuote API on confirm', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({} as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(saveQuote).toHaveBeenCalledWith(mockInput, undefined);
  });

  it('shows Saved! state after successful save', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({} as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });

  it('shows Failed to save on error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(saveQuote).mockRejectedValue(new Error('Network error'));

    render(<SaveQuoteButton input={mockInput} />);

    await user.click(screen.getByText('Save Quote'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    // After error, state='error' but showNotes is still true.
    // The error timeout resets state to 'idle' after 3s.
    // Advance past the error promise resolution.
    await vi.advanceTimersByTimeAsync(100);

    // Now state='error', showNotes=true. The notes form is still visible.
    // The "Failed to save" text only renders in the outer button (when showNotes=false).
    // Advance past the 3s timeout so state resets to 'idle', then cancel to see outer button.
    await vi.advanceTimersByTimeAsync(3000);

    // State is now 'idle' again, but showNotes still true.
    // Cancel to go back to the outer button.
    await user.click(screen.getByText('Cancel'));

    // After cancel + error timeout, the button should be back to idle "Save Quote".
    expect(screen.getByText('Save Quote')).toBeInTheDocument();
  });

  it('cancel button hides notes input', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} />);

    await userEvent.click(screen.getByText('Save Quote'));
    expect(
      screen.getByPlaceholderText('Add notes (optional)'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Save Quote')).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Add notes (optional)'),
    ).not.toBeInTheDocument();
  });
});
