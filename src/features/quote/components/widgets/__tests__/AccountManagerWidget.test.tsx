import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountManagerWidget } from '../AccountManagerWidget';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

describe('AccountManagerWidget', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders first manager by default', () => {
    render(<AccountManagerWidget />);
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(screen.getByText('widget.manager.role.senior')).toBeInTheDocument();
    expect(screen.getByText('widget.manager.dept.intl')).toBeInTheDocument();
  });

  it('shows contact details with phone, mobile, and email', () => {
    render(<AccountManagerWidget />);
    expect(screen.getByText('+82-2-1234-5678')).toBeInTheDocument();
    expect(screen.getByText('+82-10-9876-5432')).toBeInTheDocument();
    expect(screen.getByText('alex.kim@jways.com')).toBeInTheDocument();
  });

  it('navigates to next manager via button', async () => {
    const user = userEvent.setup();
    render(<AccountManagerWidget />);

    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    await user.click(screen.getByLabelText('widget.manager.next'));

    expect(screen.getByText('Sarah Park')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('navigates to previous manager via button', async () => {
    const user = userEvent.setup();
    render(<AccountManagerWidget />);

    // Go to previous (wraps to last)
    await user.click(screen.getByLabelText('widget.manager.prev'));

    expect(screen.getByText('David Lee')).toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('shows working hours', () => {
    render(<AccountManagerWidget />);
    expect(screen.getByText('09:00 – 18:00 KST')).toBeInTheDocument();
  });

  it('shows online/offline status badge', () => {
    render(<AccountManagerWidget />);
    // Should show either Online or Offline depending on current time
    const statusBadge = screen.getByText(/widget\.manager\.status\.(online|offline)/);
    expect(statusBadge).toBeInTheDocument();
  });

  it('renders chat CTA button', () => {
    render(<AccountManagerWidget />);
    expect(screen.getByText('widget.manager.chat')).toBeInTheDocument();
  });

  it('renders email as mailto link', () => {
    render(<AccountManagerWidget />);
    const emailLink = screen.getByText('alex.kim@jways.com').closest('a');
    expect(emailLink).toHaveAttribute('href', 'mailto:alex.kim@jways.com');
  });

  it('renders phone as tel link', () => {
    render(<AccountManagerWidget />);
    const phoneLink = screen.getByText('+82-2-1234-5678').closest('a');
    expect(phoneLink).toHaveAttribute('href', 'tel:+82212345678');
  });

  it('copies contact info to clipboard on copy button click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<AccountManagerWidget />);

    const copyButtons = screen.getAllByLabelText('widget.manager.copy');
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('+82-2-1234-5678');
    });
  });

  it('shows copy button visible on mobile (opacity-100)', () => {
    render(<AccountManagerWidget />);
    const copyButtons = screen.getAllByLabelText('widget.manager.copy');
    expect(copyButtons[0]).toHaveClass('opacity-100');
  });
});
