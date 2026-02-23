import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// Mock the JournalEntryForm sub-component to avoid rendering its Dialog complexity
vi.mock('@/components/farm/journal-entry-form', () => ({
  JournalEntryForm: ({ open }: { open: boolean }) =>
    open ? <div data-testid="journal-entry-form">Entry Form</div> : null,
}));

import { JournalListPanel } from '@/components/farm/journal-list-panel';

describe('JournalListPanel', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders loading state', () => {
    // Fetch never resolves so loading remains true
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    const { container } = render(<JournalListPanel farmId="farm-1" />);

    // Loading state renders a Loader2 with animate-spin
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('renders empty state when no entries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [], hasMore: false }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    await waitFor(() => {
      expect(screen.getByText('No journal entries yet')).toBeDefined();
    });

    expect(
      screen.getByText('Track observations, weather, harvests, and wildlife sightings.')
    ).toBeDefined();
    expect(screen.getByText('Log your first observation')).toBeDefined();
  });

  it('renders entries grouped by month', async () => {
    // Create entries from two different months
    const entries = [
      {
        id: 'je-1',
        farm_id: 'farm-1',
        author_id: 'user-1',
        entry_date: Math.floor(new Date('2025-06-15T12:00:00Z').getTime() / 1000),
        title: 'Summer Planting',
        content: 'Planted tomatoes and peppers in the annual beds.',
        media_urls: null,
        weather: 'Sunny',
        tags: '["planting","summer"]',
        is_shared_to_community: 0,
        created_at: 1718400000,
        updated_at: 1718400000,
      },
      {
        id: 'je-2',
        farm_id: 'farm-1',
        author_id: 'user-1',
        entry_date: Math.floor(new Date('2025-06-10T12:00:00Z').getTime() / 1000),
        title: 'Soil Test Results',
        content: 'pH 6.5, nitrogen levels adequate.',
        media_urls: null,
        weather: 'Cloudy',
        tags: '["soil","observation"]',
        is_shared_to_community: 0,
        created_at: 1717900000,
        updated_at: 1717900000,
      },
      {
        id: 'je-3',
        farm_id: 'farm-1',
        author_id: 'user-1',
        entry_date: Math.floor(new Date('2025-05-20T12:00:00Z').getTime() / 1000),
        title: 'Spring Observation',
        content: 'Pollinators arriving. Comfrey in full bloom.',
        media_urls: null,
        weather: 'Partly cloudy',
        tags: '["observation","pollinators"]',
        is_shared_to_community: 1,
        created_at: 1716200000,
        updated_at: 1716200000,
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries, hasMore: false }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    // Wait for entries to appear
    await waitFor(() => {
      expect(screen.getByText('Summer Planting')).toBeDefined();
    });

    // Verify entries are rendered
    expect(screen.getByText('Soil Test Results')).toBeDefined();
    expect(screen.getByText('Spring Observation')).toBeDefined();

    // Verify month group headings
    expect(screen.getByText('June 2025')).toBeDefined();
    expect(screen.getByText('May 2025')).toBeDefined();

    // Verify weather badges
    expect(screen.getByText('Sunny')).toBeDefined();
    expect(screen.getByText('Cloudy')).toBeDefined();
  });

  it('renders the Farm Journal header and New Entry button', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [], hasMore: false }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    await waitFor(() => {
      expect(screen.getByText('Farm Journal')).toBeDefined();
    });

    expect(screen.getByText('New Entry')).toBeDefined();
  });

  it('renders Load more button when hasMore is true', async () => {
    const entries = [
      {
        id: 'je-1',
        farm_id: 'farm-1',
        author_id: 'user-1',
        entry_date: Math.floor(new Date('2025-06-15T12:00:00Z').getTime() / 1000),
        title: 'Entry 1',
        content: 'Content of entry 1.',
        media_urls: null,
        weather: null,
        tags: null,
        is_shared_to_community: 0,
        created_at: 1718400000,
        updated_at: 1718400000,
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries, hasMore: true }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    await waitFor(() => {
      expect(screen.getByText('Load more')).toBeDefined();
    });
  });

  it('does not render Load more when hasMore is false', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          {
            id: 'je-1',
            farm_id: 'farm-1',
            author_id: 'user-1',
            entry_date: Math.floor(new Date('2025-06-15T12:00:00Z').getTime() / 1000),
            title: 'Only Entry',
            content: 'Content.',
            media_urls: null,
            weather: null,
            tags: null,
            is_shared_to_community: 0,
            created_at: 1718400000,
            updated_at: 1718400000,
          },
        ],
        hasMore: false,
      }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    await waitFor(() => {
      expect(screen.getByText('Only Entry')).toBeDefined();
    });

    expect(screen.queryByText('Load more')).toBeNull();
  });

  it('truncates long content to 160 characters with ellipsis', async () => {
    const longContent =
      'A'.repeat(200);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          {
            id: 'je-1',
            farm_id: 'farm-1',
            author_id: 'user-1',
            entry_date: Math.floor(new Date('2025-06-15T12:00:00Z').getTime() / 1000),
            title: null,
            content: longContent,
            media_urls: null,
            weather: null,
            tags: null,
            is_shared_to_community: 0,
            created_at: 1718400000,
            updated_at: 1718400000,
          },
        ],
        hasMore: false,
      }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    await waitFor(() => {
      const truncated = 'A'.repeat(160) + '...';
      expect(screen.getByText(truncated)).toBeDefined();
    });
  });

  it('renders tag badges', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: [
          {
            id: 'je-1',
            farm_id: 'farm-1',
            author_id: 'user-1',
            entry_date: Math.floor(new Date('2025-06-15T12:00:00Z').getTime() / 1000),
            title: 'Tagged Entry',
            content: 'This entry has tags.',
            media_urls: null,
            weather: null,
            tags: '["planting","harvest"]',
            is_shared_to_community: 0,
            created_at: 1718400000,
            updated_at: 1718400000,
          },
        ],
        hasMore: false,
      }),
    });

    render(<JournalListPanel farmId="farm-1" />);

    await waitFor(() => {
      expect(screen.getByText('planting')).toBeDefined();
    });

    expect(screen.getByText('harvest')).toBeDefined();
  });

  it('fetches entries with correct farm_id parameter', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [], hasMore: false }),
    });

    render(<JournalListPanel farmId="my-farm-42" />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('farm_id=my-farm-42')
      );
    });
  });

  it('handles fetch failure gracefully (shows empty state)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<JournalListPanel farmId="farm-1" />);

    // After fetch failure, loading ends and entries is empty, showing empty state
    await waitFor(() => {
      expect(screen.getByText('No journal entries yet')).toBeDefined();
    });
  });
});
