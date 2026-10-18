import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequestFile } from './client';

describe('apiRequestFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the body as a Blob and the filename from Content-Disposition', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('zip-bytes', {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="northwind.zip"' },
      }),
    );

    const file = await apiRequestFile('/datasets/1/export');

    expect(file.filename).toBe('northwind.zip');
    expect(await file.blob.text()).toBe('zip-bytes');
  });

  it('gives no filename when the server sends none', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('a,b', { status: 200 }));

    const file = await apiRequestFile('/datasets/1/export?table=customers');

    expect(file.filename).toBeNull();
  });
});
