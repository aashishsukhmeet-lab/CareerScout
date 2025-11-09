import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JobCard from './JobCard';
import { JobPosting } from '../types';

const mockJob: JobPosting = {
  id: 'job-1',
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  location: 'San Francisco, CA',
  remote: false,
  postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  descriptionSnippet: 'We are looking for an experienced software engineer...',
  source: 'JSearch',
  applyUrl: 'https://example.com/apply',
  salary: {
    min: 120000,
    max: 180000,
    currency: 'USD',
    period: 'year',
  },
  tags: ['javascript', 'react', 'node.js'],
};

describe('JobCard', () => {
  it('renders job title', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  it('renders company name', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
  });

  it('renders location', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
  });

  it('renders remote badge when job is remote', () => {
    const remoteJob = { ...mockJob, remote: true };
    render(<JobCard job={remoteJob} />);
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('does not render remote badge when job is not remote', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.queryByText('Remote')).not.toBeInTheDocument();
  });

  it('renders posted date in relative format', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText(/2d ago/i)).toBeInTheDocument();
  });

  it('renders salary when available', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText(/USD 120,000 - 180,000\/yr/)).toBeInTheDocument();
  });

  it('does not render salary when not available', () => {
    const jobWithoutSalary = { ...mockJob, salary: undefined };
    render(<JobCard job={jobWithoutSalary} />);
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
  });

  it('renders description snippet', () => {
    render(<JobCard job={mockJob} />);
    expect(
      screen.getByText(/We are looking for an experienced software engineer/)
    ).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('node.js')).toBeInTheDocument();
  });

  it('limits tags to 5 and shows count for remaining', () => {
    const jobWithManyTags = {
      ...mockJob,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
    };
    render(<JobCard job={jobWithManyTags} />);

    // Should show first 5 tags
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag5')).toBeInTheDocument();

    // Should show "+2 more"
    expect(screen.getByText('+2 more')).toBeInTheDocument();

    // Should not show tag6
    expect(screen.queryByText('tag6')).not.toBeInTheDocument();
  });

  it('renders apply button with correct link', () => {
    render(<JobCard job={mockJob} />);
    const applyButton = screen.getByRole('link', { name: /apply now/i });
    expect(applyButton).toHaveAttribute('href', 'https://example.com/apply');
    expect(applyButton).toHaveAttribute('target', '_blank');
    expect(applyButton).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders source information', () => {
    render(<JobCard job={mockJob} />);
    expect(screen.getByText(/via JSearch/i)).toBeInTheDocument();
  });
});
