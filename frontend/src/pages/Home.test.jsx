import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppStateProvider } from '../context/AppState.jsx';
import App from '../App.jsx';
import { RESOURCE, mockFetch } from '../test/fixtures.js';

function renderApp() {
  return render(
    <MemoryRouter>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>,
  );
}

let searchResponse;
beforeEach(() => {
  searchResponse = {
    body: {
      status: 'ok',
      interpreted: { categories: ['Food'], keywords: ['food'] },
      city: 'Surrey',
      count: 1,
      results: [RESOURCE],
    },
  };
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/cities': { body: { cities: ['Surrey', 'Vancouver'] } },
      'POST /api/search': () => searchResponse,
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('Home search', () => {
  it('sends the query and city as JSON and renders the returned cards', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findAllByRole('option', { name: 'Surrey, BC' });
    await user.selectOptions(screen.getByLabelText('Search in city'), 'Surrey');
    await user.type(screen.getByLabelText('Describe what you need'), 'food bank');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Surrey Food Bank' })).toBeInTheDocument();
    expect(screen.getByText('Showing 1 resource in Surrey, BC')).toBeInTheDocument();

    const [, options] = fetch.mock.calls.find(([url, o]) => url === '/api/search' && o.method === 'POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ query: 'food bank', city: 'Surrey' });
  });

  it('shows the 211 referral when there are no results', async () => {
    searchResponse = {
      body: {
        status: 'no_results',
        interpreted: {},
        city: null,
        count: 0,
        results: [],
        message: 'Please call 2-1-1.',
      },
    };
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText('Describe what you need'), 'xyzzy');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Please call 2-1-1.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call 2-1-1' })).toHaveAttribute('href', 'tel:211');
  });

  it('shows the API error message', async () => {
    searchResponse = {
      status: 400,
      body: { error: { code: 'INVALID_QUERY', message: 'Please describe what you need help with.' } },
    };
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText('Describe what you need'), 'food');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please describe what you need help with.');
  });

  it('quick-search chips send their query', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Food' }));
    await screen.findByRole('heading', { name: 'Surrey Food Bank' });
    const [, options] = fetch.mock.calls.find(([url]) => url === '/api/search');
    expect(JSON.parse(options.body).query).toBe('food bank and meals');
  });
});
