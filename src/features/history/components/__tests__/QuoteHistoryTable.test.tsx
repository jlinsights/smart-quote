import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuoteHistoryTable } from '../QuoteHistoryTable';
import { QuoteSummary } from '@/types';

const mockQuote: QuoteSummary = {
  id: 1,
  referenceNo: 'SQ-2026-0001',
  destinationCountry: 'US',
  totalQuoteAmount: 1500000,
  totalQuoteAmountUsd: 1150.5,
  profitMargin: 20.0,
  billableWeight: 15.5,
  status: 'draft',
  createdAt: '2026-02-14T00:00:00Z',
};

const defaultProps = {
  quotes: [mockQuote],
  isLoading: false,
  hasActiveFilters: false,
  onView: vi.fn(),
  onDelete: vi.fn(),
};

describe('QuoteHistoryTable', () => {
  it('renders table headers', () => {
    render(<QuoteHistoryTable {...defaultProps} />);

    expect(screen.getByText('Ref No')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Dest')).toBeInTheDocument();
    expect(screen.getByText('Amount (KRW)')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders quote rows with formatted data', () => {
    render(<QuoteHistoryTable {...defaultProps} />);

    expect(screen.getByText('SQ-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('1,500,000')).toBeInTheDocument();
    expect(screen.getByText('$1,150.50')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<QuoteHistoryTable {...defaultProps} quotes={[]} isLoading={true} />);

    expect(screen.getByText('Loading quotes...')).toBeInTheDocument();
  });

  it('shows empty message when no quotes and no filters', () => {
    render(
      <QuoteHistoryTable
        {...defaultProps}
        quotes={[]}
        hasActiveFilters={false}
      />,
    );

    expect(
      screen.getByText('No quotes saved yet. Calculate a quote and save it!'),
    ).toBeInTheDocument();
  });

  it('shows filter message when no quotes and hasActiveFilters', () => {
    render(
      <QuoteHistoryTable
        {...defaultProps}
        quotes={[]}
        hasActiveFilters={true}
      />,
    );

    expect(
      screen.getByText('No quotes match your filters.'),
    ).toBeInTheDocument();
  });

  it('calls onView with correct id when view button clicked', async () => {
    const onView = vi.fn();
    render(<QuoteHistoryTable {...defaultProps} onView={onView} />);

    const viewButton = screen.getByTitle('View detail');
    await userEvent.click(viewButton);

    expect(onView).toHaveBeenCalledWith(1);
  });

  it('calls onDelete with correct id and refNo when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(<QuoteHistoryTable {...defaultProps} onDelete={onDelete} />);

    const deleteButton = screen.getByTitle('Delete');
    await userEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(1, 'SQ-2026-0001');
  });
});
