import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Disclaimer from './Disclaimer';
import RelatedPillars from './RelatedPillars';

describe('Disclaimer', () => {
  it('renders general variant in Korean by default', () => {
    render(<Disclaimer />);
    expect(screen.getByText('안내')).toBeInTheDocument();
    expect(screen.getByText(/일반 정보 제공/)).toBeInTheDocument();
    expect(screen.getByText(/일부 AI 도구를 활용해 작성/)).toBeInTheDocument();
  });

  it('renders English variant when lang="en"', () => {
    render(<Disclaimer lang='en' />);
    expect(screen.getByText('Notice')).toBeInTheDocument();
    expect(screen.getByText(/general information purposes/)).toBeInTheDocument();
    expect(screen.getByText(/AI tools and reviewed by the BridgeLogis operations team/)).toBeInTheDocument();
  });

  it('renders legal variant heading in Korean', () => {
    render(<Disclaimer variant='legal' />);
    expect(screen.getByText('법률·관세 면책')).toBeInTheDocument();
    expect(screen.getByText(/법률 자문이 아니며/)).toBeInTheDocument();
  });

  it('renders financial variant heading in English', () => {
    render(<Disclaimer variant='financial' lang='en' />);
    expect(screen.getByText('Pricing & Rate Disclaimer')).toBeInTheDocument();
    expect(screen.getByText(/typical market values at publication time/)).toBeInTheDocument();
  });

  it('renders safety variant', () => {
    render(<Disclaimer variant='safety' />);
    expect(screen.getByText('항공 안전·위험물 면책')).toBeInTheDocument();
    expect(screen.getByText(/IATA DGR\/ICAO TI/)).toBeInTheDocument();
  });

  it('attaches data attributes for variant and lang', () => {
    render(<Disclaimer variant='legal' lang='en' />);
    const aside = screen.getByRole('note');
    expect(aside).toHaveAttribute('data-disclaimer-variant', 'legal');
    expect(aside).toHaveAttribute('data-lang', 'en');
  });

  it('renders extra items as a list', () => {
    render(<Disclaimer extra={['추가 항목 A', '추가 항목 B']} />);
    expect(screen.getByText('추가 항목 A')).toBeInTheDocument();
    expect(screen.getByText('추가 항목 B')).toBeInTheDocument();
  });

  it('renders reviewedAt as time element', () => {
    render(<Disclaimer reviewedAt='2026-05-01' />);
    const time = screen.getByText('2026-05-01');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-05-01');
  });

  it('renders children when provided', () => {
    render(
      <Disclaimer>
        <span data-testid='custom-child'>custom child</span>
      </Disclaimer>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});

describe('RelatedPillars', () => {
  const SAMPLE_ITEMS = [
    {
      slug: 'gssa-complete-guide',
      title: 'GSSA 완벽 가이드',
      category: 'GSSA',
      description: 'GSSA 운영 핵심',
    },
    {
      slug: 'fsc-complete-guide',
      title: 'FSC 완전 가이드',
      category: 'FSC',
    },
  ];

  it('returns null when items is empty', () => {
    const { container } = render(<RelatedPillars items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('uses default Korean heading', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} />);
    expect(screen.getByText('함께 읽으면 좋은 인사이트')).toBeInTheDocument();
  });

  it('uses default English heading when lang="en"', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} lang='en' />);
    expect(screen.getByText('Related Insights')).toBeInTheDocument();
  });

  it('uses custom heading when provided', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} heading='맞춤 제목' />);
    expect(screen.getByText('맞춤 제목')).toBeInTheDocument();
  });

  it('renders each item as a link with correct href', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} />);
    expect(
      screen.getByRole('link', { name: /GSSA 완벽 가이드/ })
    ).toHaveAttribute('href', '/pillars/gssa-complete-guide');
    expect(
      screen.getByRole('link', { name: /FSC 완전 가이드/ })
    ).toHaveAttribute('href', '/pillars/fsc-complete-guide');
  });

  it('shows category labels', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} />);
    expect(screen.getByText('GSSA')).toBeInTheDocument();
    expect(screen.getByText('FSC')).toBeInTheDocument();
  });

  it('shows description only when provided', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} />);
    expect(screen.getByText('GSSA 운영 핵심')).toBeInTheDocument();
    // Second item has no description so it should not appear in the document
    expect(screen.queryByText('FSC 핵심 가이드')).not.toBeInTheDocument();
  });

  it('attaches data-count attribute reflecting item count', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} />);
    const section = screen.getByLabelText('함께 읽으면 좋은 인사이트');
    expect(section).toHaveAttribute('data-count', '2');
  });

  it('uses Korean read label by default', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} />);
    expect(screen.getAllByText(/바로가기/).length).toBeGreaterThan(0);
  });

  it('uses English read label when lang="en"', () => {
    render(<RelatedPillars items={SAMPLE_ITEMS} lang='en' />);
    expect(screen.getAllByText(/Read/).length).toBeGreaterThan(0);
  });
});
