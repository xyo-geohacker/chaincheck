import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleLinksPanel } from '../CollapsibleLinksPanel';

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('CollapsibleLinksPanel', () => {
  const mockLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/network', label: 'Network', external: false },
    { href: 'https://example.com', label: 'External Link', external: true }
  ];

  it('should render with default title', () => {
    render(<CollapsibleLinksPanel links={mockLinks} />);

    expect(screen.getByText('ChainCheck Links')).toBeTruthy();
  });

  it('should render with custom title', () => {
    render(<CollapsibleLinksPanel title="Custom Title" links={mockLinks} />);

    expect(screen.getByText('Custom Title')).toBeTruthy();
  });

  it('should display link count', () => {
    render(<CollapsibleLinksPanel links={mockLinks} />);

    expect(screen.getByText('3 links')).toBeTruthy();
  });

  it('should display singular "link" for single item', () => {
    const singleLink = [{ href: '/dashboard', label: 'Dashboard' }];
    render(<CollapsibleLinksPanel links={singleLink} />);

    expect(screen.getByText('1 link')).toBeTruthy();
  });

  it('should be collapsed by default', () => {
    render(<CollapsibleLinksPanel links={mockLinks} />);

    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Network')).toBeNull();
  });

  it('should be expanded when defaultExpanded is true', () => {
    render(<CollapsibleLinksPanel links={mockLinks} defaultExpanded={true} />);

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Network')).toBeTruthy();
    expect(screen.getByText('External Link')).toBeTruthy();
  });

  it('should expand when button is clicked', () => {
    render(<CollapsibleLinksPanel links={mockLinks} />);

    const button = screen.getByText('ChainCheck Links').closest('button');
    fireEvent.click(button!);

    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Network')).toBeTruthy();
    expect(screen.getByText('External Link')).toBeTruthy();
  });

  it('should collapse when button is clicked while expanded', () => {
    render(<CollapsibleLinksPanel links={mockLinks} defaultExpanded={true} />);

    expect(screen.getByText('Dashboard')).toBeTruthy();

    const button = screen.getByText('ChainCheck Links').closest('button');
    fireEvent.click(button!);

    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('should render all links when expanded', () => {
    render(<CollapsibleLinksPanel links={mockLinks} defaultExpanded={true} />);

    mockLinks.forEach(link => {
      expect(screen.getByText(link.label)).toBeTruthy();
    });
  });

  it('should set external link attributes correctly', () => {
    render(<CollapsibleLinksPanel links={mockLinks} defaultExpanded={true} />);

    const externalLink = screen.getByText('External Link');
    expect(externalLink.closest('a')).toHaveAttribute('target', '_blank');
    expect(externalLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should not set external attributes for internal links', () => {
    render(<CollapsibleLinksPanel links={mockLinks} defaultExpanded={true} />);

    const internalLink = screen.getByText('Dashboard');
    const linkElement = internalLink.closest('a');
    expect(linkElement).not.toHaveAttribute('target');
    expect(linkElement).not.toHaveAttribute('rel');
  });

  it('should have correct href attributes', () => {
    render(<CollapsibleLinksPanel links={mockLinks} defaultExpanded={true} />);

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Network').closest('a')).toHaveAttribute('href', '/network');
    expect(screen.getByText('External Link').closest('a')).toHaveAttribute('href', 'https://example.com');
  });

  it('should toggle aria-expanded attribute', () => {
    render(<CollapsibleLinksPanel links={mockLinks} />);

    const button = screen.getByText('ChainCheck Links').closest('button');
    
    // Initially collapsed
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-label', 'Expand ChainCheck Links');

    // Expand
    fireEvent.click(button!);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-label', 'Collapse ChainCheck Links');

    // Collapse
    fireEvent.click(button!);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should handle empty links array', () => {
    render(<CollapsibleLinksPanel links={[]} />);

    expect(screen.getByText('ChainCheck Links')).toBeTruthy();
    expect(screen.getByText('0 links')).toBeTruthy();
  });
});

