import { describe, expect, it } from 'vitest';
import { directionsUrl, displayHost, formatDate, safeUrl, telHref } from './format.js';

describe('format helpers', () => {
  it('formats review dates in UTC so they do not shift a day', () => {
    expect(formatDate('2026-09-15T00:00:00.000Z')).toBe('Sep 15, 2026');
    expect(formatDate(null)).toBeNull();
    expect(formatDate('not a date')).toBeNull();
  });

  it('only allows http(s) links', () => {
    expect(safeUrl('https://ugm.ca')).toBe('https://ugm.ca');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('ugm.ca')).toBeNull();
  });

  it('builds tel links and display hosts', () => {
    expect(telHref('(604) 681-4437')).toBe('tel:6046814437');
    expect(telHref('')).toBeNull();
    expect(telHref('604-660-3511 (toll-free 1-888-664-3344)')).toBe('tel:6046603511');
    expect(telHref('604-294-5444 (North); 604-307-2945 (South)')).toBe('tel:6042945444');
    expect(telHref('604-951-1122 ext. 1')).toBe('tel:6049511122');
    expect(telHref('1-800-665-1185')).toBe('tel:18006651185');
    expect(telHref('call us')).toBeNull();
    expect(displayHost('https://www.phs.ca/about')).toBe('phs.ca');
  });

  it('builds a maps link from the address only', () => {
    const url = directionsUrl({
      service_name: 'Atira',
      physical_address: '190 Alexander St',
      city: 'Vancouver',
    });
    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Atira%2C%20190%20Alexander%20St%2C%20Vancouver%2C%20BC',
    );
    expect(directionsUrl({ service_name: 'X', physical_address: null })).toBeNull();
  });
});
