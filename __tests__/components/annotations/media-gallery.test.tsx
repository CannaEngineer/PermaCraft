import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/image to render a plain img tag
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

import { MediaGallery } from '@/components/annotations/media-gallery';

describe('MediaGallery', () => {
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

    const { container } = render(<MediaGallery annotationId="ann-1" />);

    // The component renders a Loader2 spinner with animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('renders empty state when no media', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ media: [] }),
    });

    render(<MediaGallery annotationId="ann-1" />);

    await waitFor(() => {
      expect(screen.getByText('No photos yet')).toBeDefined();
    });
  });

  it('renders media thumbnails for images', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        media: [
          {
            id: 'media-1',
            annotation_id: 'ann-1',
            type: 'image',
            file_url: 'https://example.com/photo.jpg',
            thumbnail_url: 'https://example.com/thumb.jpg',
            caption: 'Comfrey patch in bloom',
            display_order: 0,
            uploaded_at: 1700000000,
          },
          {
            id: 'media-2',
            annotation_id: 'ann-1',
            type: 'image',
            file_url: 'https://example.com/photo2.jpg',
            thumbnail_url: null,
            caption: null,
            display_order: 1,
            uploaded_at: 1700001000,
          },
        ],
      }),
    });

    render(<MediaGallery annotationId="ann-1" />);

    await waitFor(() => {
      expect(screen.getByText('Media')).toBeDefined();
    });

    // Caption text should appear
    expect(screen.getByText('Comfrey patch in bloom')).toBeDefined();

    // Check that images are rendered with correct src attributes
    const images = screen.getAllByRole('img');
    // First image should use thumbnail_url, second should use file_url as fallback
    expect(images[0]).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/photo2.jpg');
  });

  it('renders video elements for video media', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        media: [
          {
            id: 'media-3',
            annotation_id: 'ann-1',
            type: 'video',
            file_url: 'https://example.com/clip.mp4',
            thumbnail_url: null,
            caption: 'Time-lapse of growth',
            display_order: 0,
            uploaded_at: 1700000000,
          },
        ],
      }),
    });

    const { container } = render(<MediaGallery annotationId="ann-1" />);

    await waitFor(() => {
      expect(screen.getByText('Media')).toBeDefined();
    });

    const videoElement = container.querySelector('video');
    expect(videoElement).not.toBeNull();
    expect(videoElement!.getAttribute('src')).toBe('https://example.com/clip.mp4');
    expect(screen.getByText('Time-lapse of growth')).toBeDefined();
  });

  it('fetches media for the given annotation id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ media: [] }),
    });

    render(<MediaGallery annotationId="ann-42" />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/annotations/ann-42/media');
    });
  });

  it('handles fetch error gracefully (shows empty state)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<MediaGallery annotationId="ann-1" />);

    await waitFor(() => {
      expect(screen.getByText('No photos yet')).toBeDefined();
    });
  });

  it('does not show delete buttons when not editable', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        media: [
          {
            id: 'media-1',
            annotation_id: 'ann-1',
            type: 'image',
            file_url: 'https://example.com/photo.jpg',
            thumbnail_url: null,
            caption: null,
            display_order: 0,
            uploaded_at: 1700000000,
          },
        ],
      }),
    });

    const { container } = render(
      <MediaGallery annotationId="ann-1" editable={false} />
    );

    await waitFor(() => {
      expect(screen.getByText('Media')).toBeDefined();
    });

    // The delete button uses destructive styling; it should not be present
    const deleteButtons = container.querySelectorAll('.bg-destructive');
    expect(deleteButtons.length).toBe(0);
  });
});
