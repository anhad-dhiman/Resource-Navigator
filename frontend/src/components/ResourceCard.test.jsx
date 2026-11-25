import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResourceCard from './ResourceCard.jsx';
import { RESOURCE } from '../test/fixtures.js';

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter>
      <ResourceCard resource={{ ...RESOURCE, ...overrides }} />
    </MemoryRouter>,
  );
}

describe('ResourceCard', () => {
  it('shows the database fields and provenance', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Surrey Food Bank' })).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Unit 1 - 13478 78th Avenue, Surrey')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '604-581-5443' })).toHaveAttribute('href', 'tel:6045815443');
    expect(screen.getByRole('link', { name: /surreyfoodbank\.org/ })).toHaveAttribute(
      'href',
      'https://surreyfoodbank.org',
    );
    expect(screen.getByText('Reviewed Sep 15, 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/resources/8');
  });

  it('does not link unsafe URLs', () => {
    renderCard({ official_url: 'javascript:alert(1)' });
    expect(screen.queryByText(/javascript/)).not.toBeInTheDocument();
  });

  it('shows only database fields, no AI text', () => {
    renderCard({ match_explanation: 'AI text that must not appear' });
    expect(screen.queryByText('AI text that must not appear')).not.toBeInTheDocument();
  });
});
