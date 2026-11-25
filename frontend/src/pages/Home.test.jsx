import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
let summaryResponse;
let searchReplies;
beforeEach(() => {
  searchResponse = {
    body: {
      status: 'ok',
      interpreted: { categories: ['Food'], keywords: ['food'] },
      urgency: null,
      summary_available: false,
      city: 'Surrey',
      count: 1,
      results: [RESOURCE],
    },
  };
  summaryResponse = {
    body: { summary: 'These food banks give groceries.', ai: { summarized_by: 'gemini' } },
  };
  searchReplies = [];
  vi.stubGlobal(
    'fetch',
    mockFetch({
      'GET /api/cities': { body: { cities: ['Surrey', 'Vancouver'] } },
      'POST /api/search': () => searchReplies.shift() ?? searchResponse,
      'POST /api/search/summary': () => summaryResponse,
    }),
  );
});

const searchCalls = () => fetch.mock.calls.filter(([url]) => url === '/api/search');

async function searchFor(user, text) {
  await user.type(screen.getByLabelText('Describe what you need'), text);
  await user.click(screen.getByRole('button', { name: 'Search' }));
}
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

  it('does not search when the city changes', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findAllByRole('option', { name: 'Surrey, BC' });
    await searchFor(user, 'food');
    await screen.findByRole('heading', { name: 'Surrey Food Bank' });
    await user.selectOptions(screen.getByLabelText('Search in city'), 'Vancouver');
    expect(searchCalls()).toHaveLength(1);
  });

  it('shows cards first, then fetches one summary for them', async () => {
    searchResponse.body.summary_available = true;
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'food bank');
    expect(await screen.findByText('These food banks give groceries.')).toBeInTheDocument();
    expect(screen.getByText('AI summary')).toBeInTheDocument();
    const [, options] = fetch.mock.calls.find(([url]) => url === '/api/search/summary');
    expect(JSON.parse(options.body)).toEqual({ query: 'food bank', resource_ids: [8] });
  });

  it('keeps the cards and hides the summary when the summary fails', async () => {
    searchResponse.body.summary_available = true;
    summaryResponse = { status: 503, body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'x' } } };
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'food bank');
    expect(await screen.findByRole('heading', { name: 'Surrey Food Bank' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/Writing a short summary/)).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not ask for a summary when none is offered', async () => {
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'food bank');
    await screen.findByRole('heading', { name: 'Surrey Food Bank' });
    expect(fetch.mock.calls.some(([url]) => url === '/api/search/summary')).toBe(false);
  });

  it('shows the 9-1-1 banner above results for an emergency', async () => {
    searchResponse.body.urgency = 'emergency';
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'I got into an accident');
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('call 9-1-1 now');
    expect(screen.getByRole('link', { name: 'Call 9-1-1' })).toHaveAttribute('href', 'tel:911');
    expect(screen.getByRole('heading', { name: 'Surrey Food Bank' })).toBeInTheDocument();
  });

  it('shows 9-8-8 for self-harm', async () => {
    searchResponse.body = {
      ...searchResponse.body,
      status: 'no_results',
      urgency: 'self_harm',
      results: [],
      message: 'No match.',
    };
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'I want to hurt myself');
    expect(await screen.findByRole('link', { name: 'Call 9-8-8' })).toHaveAttribute('href', 'tel:988');
    expect(screen.getByRole('link', { name: 'Text 9-8-8' })).toHaveAttribute('href', 'sms:988');
  });

  it('explains when a query is not about community services', async () => {
    searchResponse.body = {
      ...searchResponse.body,
      status: 'irrelevant',
      results: [],
      message: 'We can only help you find community services.',
    };
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'tell me a joke');
    expect(await screen.findByText('We can only help you find community services.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tell us what you need help with' })).toBeInTheDocument();
  });

  it('shows the pause message when search is paused', async () => {
    searchResponse = {
      status: 429,
      body: { error: { code: 'SEARCH_PAUSED', message: 'Search is paused for 30 minutes.' } },
    };
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'joke');
    expect(await screen.findByRole('alert')).toHaveTextContent('Search is paused for 30 minutes.');
  });

  it.each([
    ['a dropped connection', { networkError: true }],
    ['a proxy error with no JSON body', { status: 500, notJson: true }],
  ])('retries the search once after %s', async (_label, failure) => {
    searchReplies = [failure];
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'food');
    expect(await screen.findByRole('heading', { name: 'Surrey Food Bank' })).toBeInTheDocument();
    expect(searchCalls()).toHaveLength(2);
  });

  it('does not retry an error from the API itself', async () => {
    searchResponse = {
      status: 503,
      body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Temporarily unavailable.' } },
    };
    const user = userEvent.setup();
    renderApp();
    await searchFor(user, 'food');
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable.');
    expect(searchCalls()).toHaveLength(1);
  });
});
