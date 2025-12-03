import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  it('should render with title', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeTruthy();
  });

  it('should be collapsed by default', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.getByText('+')).toBeTruthy();
  });

  it('should be expanded when defaultOpen is true', () => {
    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.getByText('−')).toBeTruthy();
  });

  it('should expand when button is clicked', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('Content')).toBeNull();

    const button = screen.getByText('Test Section').closest('button');
    fireEvent.click(button!);

    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.getByText('−')).toBeTruthy();
  });

  it('should collapse when button is clicked while expanded', () => {
    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>Content</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('Content')).toBeTruthy();

    const button = screen.getByText('Test Section').closest('button');
    fireEvent.click(button!);

    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.getByText('+')).toBeTruthy();
  });

  it('should toggle multiple times', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>Content</div>
      </CollapsibleSection>
    );

    const button = screen.getByText('Test Section').closest('button');

    // Expand
    fireEvent.click(button!);
    expect(screen.getByText('Content')).toBeTruthy();

    // Collapse
    fireEvent.click(button!);
    expect(screen.queryByText('Content')).toBeNull();

    // Expand again
    fireEvent.click(button!);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('should render children when expanded', () => {
    render(
      <CollapsibleSection title="Test Section" defaultOpen={true}>
        <div>First Child</div>
        <div>Second Child</div>
      </CollapsibleSection>
    );

    expect(screen.getByText('First Child')).toBeTruthy();
    expect(screen.getByText('Second Child')).toBeTruthy();
  });

  it('should not render children when collapsed', () => {
    render(
      <CollapsibleSection title="Test Section">
        <div>First Child</div>
        <div>Second Child</div>
      </CollapsibleSection>
    );

    expect(screen.queryByText('First Child')).toBeNull();
    expect(screen.queryByText('Second Child')).toBeNull();
  });
});

