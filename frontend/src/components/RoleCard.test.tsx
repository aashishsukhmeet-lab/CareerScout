import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoleCard from './RoleCard';
import { ScoredRole } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockRole: ScoredRole = {
  id: '1',
  title: 'Senior AI Engineer',
  company: 'TechCorp',
  location: 'San Francisco, CA',
  tags: ['ai', 'mlops', 'python'],
  description: 'Build ML models',
  createdAt: '2024-01-15T00:00:00Z',
  score: 8.5,
  rationale: ['Matches interests: ai, mlops', 'Recent posting (85%)'],
};

describe('RoleCard', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should render role information', () => {
    render(<RoleCard role={mockRole} />, { wrapper });

    expect(screen.getByText('Senior AI Engineer')).toBeInTheDocument();
    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
  });

  it('should display tags', () => {
    render(<RoleCard role={mockRole} />, { wrapper });

    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('mlops')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('should display score', () => {
    render(<RoleCard role={mockRole} />, { wrapper });

    expect(screen.getByText('8.5')).toBeInTheDocument();
  });

  it('should display rationale', () => {
    render(<RoleCard role={mockRole} />, { wrapper });

    expect(screen.getByText(/Matches interests/)).toBeInTheDocument();
    expect(screen.getByText(/Recent posting/)).toBeInTheDocument();
  });

  it('should show like and dislike buttons', () => {
    render(<RoleCard role={mockRole} />, { wrapper });

    expect(screen.getByText(/Like/)).toBeInTheDocument();
    expect(screen.getByText(/Dislike/)).toBeInTheDocument();
  });

  it('should show undo button when feedback exists', () => {
    render(<RoleCard role={mockRole} hasFeedback feedbackValue="LIKE" />, {
      wrapper,
    });

    expect(screen.getByText(/Liked/)).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('should toggle dislike reason dropdown', () => {
    render(<RoleCard role={mockRole} />, { wrapper });

    const dislikeButton = screen.getByText(/Dislike/);
    fireEvent.click(dislikeButton);

    expect(screen.getByText('Why?')).toBeInTheDocument();
    expect(screen.getByText('Too senior')).toBeInTheDocument();
    expect(screen.getByText('Too junior')).toBeInTheDocument();
  });
});
