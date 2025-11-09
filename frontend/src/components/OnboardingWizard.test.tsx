import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import OnboardingWizard from './OnboardingWizard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('OnboardingWizard', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  it('should render step 1 initially', () => {
    render(<OnboardingWizard />, { wrapper });

    expect(screen.getByText(/What are your primary interests/)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('should show interest options', () => {
    render(<OnboardingWizard />, { wrapper });

    expect(screen.getByText('salesforce')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('fintech')).toBeInTheDocument();
  });

  it('should allow selecting interests', () => {
    render(<OnboardingWizard />, { wrapper });

    const aiButton = screen.getByText('ai');
    fireEvent.click(aiButton);

    // Button should now have active styling (assuming it changes class)
    expect(aiButton).toHaveClass('bg-blue-600');
  });

  it('should navigate to step 2', () => {
    render(<OnboardingWizard />, { wrapper });

    // Select an interest
    fireEvent.click(screen.getByText('ai'));

    // Click Next
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(screen.getByText(/What's your seniority preference/)).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  });

  it('should disable Next button if no interests selected', () => {
    render(<OnboardingWizard />, { wrapper });

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('should show progress bar', () => {
    render(<OnboardingWizard />, { wrapper });

    const progressBar = document.querySelector('[style*="width"]');
    expect(progressBar).toBeTruthy();
  });
});
