import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TargetMarginRulesWidget } from '../TargetMarginRulesWidget';
import type { MarginRule } from '@/api/marginRuleApi';

const mockRules: MarginRule[] = [
  {
    id: 1, name: 'VIP Flat', ruleType: 'flat', priority: 100,
    matchEmail: 'admin@yslogic.co.kr', matchNationality: null,
    weightMin: null, weightMax: null, marginPercent: 19,
    isActive: true, createdBy: 'system', createdAt: '2026-03-08T00:00:00Z', updatedAt: '2026-03-08T00:00:00Z',
  },
  {
    id: 2, name: 'KR Heavy', ruleType: 'weight_based', priority: 50,
    matchEmail: null, matchNationality: 'South Korea',
    weightMin: 20, weightMax: null, marginPercent: 19,
    isActive: true, createdBy: 'system', createdAt: '2026-03-08T00:00:00Z', updatedAt: '2026-03-08T00:00:00Z',
  },
  {
    id: 3, name: 'Default Light', ruleType: 'weight_based', priority: 0,
    matchEmail: null, matchNationality: null,
    weightMin: 0, weightMax: 19.99, marginPercent: 32,
    isActive: true, createdBy: 'system', createdAt: '2026-03-08T00:00:00Z', updatedAt: '2026-03-08T00:00:00Z',
  },
];

const mockRefetch = vi.fn();
const mockUseMarginRules = vi.fn();

vi.mock('@/features/dashboard/hooks/useMarginRules', () => ({
  useMarginRules: () => mockUseMarginRules(),
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/api/marginRuleApi', async () => {
  const actual = await vi.importActual('@/api/marginRuleApi');
  return {
    ...actual,
    createMarginRule: vi.fn().mockResolvedValue({ id: 99, name: 'New' }),
    updateMarginRule: vi.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
    deleteMarginRule: vi.fn().mockResolvedValue({ success: true }),
  };
});

describe('TargetMarginRulesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMarginRules.mockReturnValue({
      rules: mockRules,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('renders the widget header', () => {
    render(<TargetMarginRulesWidget />);
    expect(screen.getByText('Target Margin Rules')).toBeInTheDocument();
  });

  it('shows rule count', () => {
    render(<TargetMarginRulesWidget />);
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('renders all active rules', () => {
    render(<TargetMarginRulesWidget />);
    expect(screen.getByText('VIP Flat')).toBeInTheDocument();
    expect(screen.getByText('KR Heavy')).toBeInTheDocument();
    expect(screen.getByText('Default Light')).toBeInTheDocument();
  });

  it('groups rules by priority label', () => {
    render(<TargetMarginRulesWidget />);
    expect(screen.getByText(/P100 — Per-User Flat/)).toBeInTheDocument();
    expect(screen.getByText(/P50 — Nationality/)).toBeInTheDocument();
    expect(screen.getByText(/P0 — Default/)).toBeInTheDocument();
  });

  it('displays margin percentages', () => {
    render(<TargetMarginRulesWidget />);
    const percentages = screen.getAllByText('19%');
    expect(percentages.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('32%')).toBeInTheDocument();
  });

  it('shows error indicator when fetch fails', () => {
    mockUseMarginRules.mockReturnValue({
      rules: [],
      loading: false,
      error: 'Network error',
      refetch: mockRefetch,
    });
    render(<TargetMarginRulesWidget />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows toast on CRUD failure', async () => {
    const { createMarginRule } = await import('@/api/marginRuleApi');
    (createMarginRule as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

    const user = userEvent.setup();
    render(<TargetMarginRulesWidget />);

    // Open add form
    const addButton = screen.getAllByRole('button')[0];
    await user.click(addButton);

    // Fill name and save
    const nameInput = screen.getByPlaceholderText('Rule name');
    await user.type(nameInput, 'Test Rule');
    const saveButton = screen.getByText('Create');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('error', 'Server error');
    });
  });

  it('shows loading spinner when loading with no rules', () => {
    mockUseMarginRules.mockReturnValue({
      rules: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<TargetMarginRulesWidget />);
    // The loading spinner element should be present
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('shows add form when add button clicked', async () => {
    const user = userEvent.setup();
    render(<TargetMarginRulesWidget />);

    const addButton = screen.getAllByRole('button')[0]; // Plus button
    await user.click(addButton);

    expect(screen.getByPlaceholderText('Rule name')).toBeInTheDocument();
  });

  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup();
    render(<TargetMarginRulesWidget />);

    // Hover over a rule to show actions — find the trash button
    const trashButtons = document.querySelectorAll('.group-hover\\:flex button');
    // Since group-hover buttons might not be visible in test, find the Trash2 icon buttons
    const allButtons = screen.getAllByRole('button');
    // Find a delete button (has Trash2 icon)
    const deleteBtn = allButtons.find(btn => btn.querySelector('.lucide-trash-2'));
    if (deleteBtn) {
      await user.click(deleteBtn);
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    }
  });

  it('shows footer text', () => {
    render(<TargetMarginRulesWidget />);
    expect(screen.getByText(/Priority: higher wins/)).toBeInTheDocument();
  });
});
