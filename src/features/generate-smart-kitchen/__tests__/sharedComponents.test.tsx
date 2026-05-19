import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  KitchenImageCard,
  PrimaryButton,
  SectionCard,
  StatusBadge,
} from '../index';

describe('Generate Smart Kitchen shared UI components', () => {
  it('renders a section card with title, description, action, content, and footer', () => {
    const markup = renderToStaticMarkup(
      <SectionCard
        title="Kitchen Space"
        description="Review imported room information."
        action={<button type="button">Edit</button>}
        footer={<span>Footer note</span>}
      >
        <p>Room details</p>
      </SectionCard>,
    );

    expect(markup).toContain('Kitchen Space');
    expect(markup).toContain('Review imported room information.');
    expect(markup).toContain('Edit');
    expect(markup).toContain('Room details');
    expect(markup).toContain('Footer note');
  });

  it('renders status badge variants', () => {
    const markup = renderToStaticMarkup(<StatusBadge variant="success">Completed</StatusBadge>);

    expect(markup).toContain('Completed');
    expect(markup).toContain('bg-emerald-50');
  });

  it('renders primary button loading and full width states', () => {
    const markup = renderToStaticMarkup(
      <PrimaryButton isLoading fullWidth>
        Generate 10 AI Designs
      </PrimaryButton>,
    );

    expect(markup).toContain('Generate 10 AI Designs');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('w-full');
  });

  it('renders a kitchen image card with image metadata and badge', () => {
    const markup = renderToStaticMarkup(
      <KitchenImageCard
        imageUrl="/mock/smart-kitchen/design-03.jpg"
        alt="Modern transitional kitchen render"
        title="Design 03"
        subtitle="Modern Transitional"
        badge={<StatusBadge variant="ai">Best Overall</StatusBadge>}
        isActive
      />,
    );

    expect(markup).toContain('/mock/smart-kitchen/design-03.jpg');
    expect(markup).toContain('Modern transitional kitchen render');
    expect(markup).toContain('Design 03');
    expect(markup).toContain('Best Overall');
    expect(markup).toContain('border-pelican-teal');
  });

  it('renders an accessible fallback when image URL is missing', () => {
    const markup = renderToStaticMarkup(<KitchenImageCard alt="Missing kitchen render" />);

    expect(markup).toContain('No image available');
  });
});
