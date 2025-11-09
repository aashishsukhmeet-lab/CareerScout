import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  it('renders with placeholder text', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    expect(
      screen.getByPlaceholderText(/search for jobs/i)
    ).toBeInTheDocument();
  });

  it('shows initial value', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar initialValue="software engineer" onSearch={mockOnSearch} />);

    expect(screen.getByDisplayValue('software engineer')).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'product manager');

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('product manager');
  });

  it('calls onSearch when Enter is pressed', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'data analyst{Enter}');

    expect(mockOnSearch).toHaveBeenCalledWith('data analyst');
  });

  it('debounces auto-search when typing', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(
      <SearchBar onSearch={mockOnSearch} autoSearch={true} debounceMs={300} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'eng');

    // Should not call immediately
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockOnSearch).toHaveBeenCalledWith('eng');
      },
      { timeout: 500 }
    );
  });

  it('shows clear button when input has value', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={mockOnSearch} initialValue="test query" />);

    const clearButton = screen.getByLabelText(/clear search/i);
    await user.click(clearButton);

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('disables search button when input is empty', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeDisabled();
  });

  it('enables search button when input has value', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeEnabled();
  });

  it('does not auto-search when autoSearch is false', async () => {
    const mockOnSearch = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSearch={mockOnSearch} autoSearch={false} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    // Wait a bit to ensure no auto-search
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});
