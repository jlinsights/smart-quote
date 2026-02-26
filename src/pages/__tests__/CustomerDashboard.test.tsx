import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerDashboard from '../CustomerDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', role: 'user' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), t: (key: string) => key }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ isDarkMode: false, toggleDarkMode: vi.fn() }),
}));

vi.mock('@/features/dashboard/hooks/usePortWeather', () => ({
  usePortWeather: () => ({ data: [], loading: false, error: null, retry: vi.fn() }),
}));

vi.mock('@/features/dashboard/hooks/useLogisticsNews', () => ({
  useLogisticsNews: () => ({ data: [], loading: false, error: null, retry: vi.fn() }),
}));

vi.mock('@/api/quoteApi', () => ({
  listQuotes: vi.fn().mockResolvedValue({ quotes: [], pagination: { currentPage: 1, totalPages: 0, totalCount: 0, perPage: 5 } }),
}));

vi.mock('@/lib/format', () => ({
  formatKRW: (val: number) => `KRW ${val.toLocaleString()}`,
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <CustomerDashboard />
    </MemoryRouter>
  );
}

describe('CustomerDashboard', () => {
  it('renders welcome banner with user email', () => {
    renderDashboard();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders weather widget section', () => {
    renderDashboard();
    expect(screen.getByText('widget.weather')).toBeInTheDocument();
  });

  it('renders notice widget section', () => {
    renderDashboard();
    expect(screen.getByText('widget.notice')).toBeInTheDocument();
  });

  it('renders quote history section with empty state', async () => {
    renderDashboard();
    expect(screen.getByText('dashboard.recentQuotes')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('dashboard.noQuotes')).toBeInTheDocument();
    });
  });
});
