import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveQuoteButton } from '../SaveQuoteButton';
import { QuoteInput, QuoteResult, Incoterm, PackingType } from '@/types';

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
  items: [{ id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }],
  marginUSD: 40,
  dutyTaxEstimate: 0,
  exchangeRate: 1300,
  fscPercent: 27.5,
};

const mockResult: QuoteResult = {
  totalQuoteAmount: 185000,
  totalQuoteAmountUSD: 142.31,
  totalCostAmount: 135000,
  profitAmount: 50000,
  profitMargin: 27.0,
  currency: 'KRW',
  totalActualWeight: 1,
  totalVolumetricWeight: 0.2,
  billableWeight: 1,
  appliedZone: '8',
  transitTime: '3-5 days',
  carrier: 'UPS',
  warnings: [],
  breakdown: {
    packingMaterial: 0,
    packingLabor: 0,
    packingFumigation: 0,
    handlingFees: 0,
    intlBase: 50000,
    intlFsc: 5000,
    intlWarRisk: 2500,
    intlSurge: 0,
    destDuty: 0,
    totalCost: 57500,
  },
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
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    expect(screen.getByText('Save Quote')).toBeInTheDocument();
  });

  it('disables Save button when result is null', () => {
    render(<SaveQuoteButton input={mockInput} result={null} />);

    const button = screen.getByText('Save Quote').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('disables Save button when items are empty', () => {
    const emptyInput = { ...mockInput, items: [] };
    render(<SaveQuoteButton input={emptyInput} result={mockResult} />);

    const button = screen.getByText('Save Quote').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('shows notes input after clicking Save Quote', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));

    expect(
      screen.getByPlaceholderText('Add notes (optional)'),
    ).toBeInTheDocument();
  });

  it('calls saveQuote API on confirm', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0001' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(saveQuote).toHaveBeenCalledWith(mockInput, undefined);
  });

  it('shows Saved! with reference number after successful save', async () => {
    vi.useRealTimers();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0042' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Saved!/)).toBeInTheDocument();
      expect(screen.getByText(/SQ-2026-0042/)).toBeInTheDocument();
    });
  });

  it('shows View button after save when onSaved is provided', async () => {
    vi.useRealTimers();
    const onSaved = vi.fn();
    vi.mocked(saveQuote).mockResolvedValue({ referenceNo: 'SQ-2026-0042' } as ReturnType<typeof saveQuote> extends Promise<infer T> ? T : never);

    render(<SaveQuoteButton input={mockInput} result={mockResult} onSaved={onSaved} />);

    await userEvent.click(screen.getByText('Save Quote'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('View'));
    expect(onSaved).toHaveBeenCalledWith('SQ-2026-0042');
  });

  it('shows Failed to save on error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(saveQuote).mockRejectedValue(new Error('Network error'));

    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

    await user.click(screen.getByText('Save Quote'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await vi.advanceTimersByTimeAsync(100);

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });

  it('cancel button hides notes input', async () => {
    vi.useRealTimers();
    render(<SaveQuoteButton input={mockInput} result={mockResult} />);

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
