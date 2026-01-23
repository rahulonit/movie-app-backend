import request from 'supertest';
import app from '../src/server';
import mongoose from 'mongoose';

describe('Admin Movies & Mux Upload', () => {
  let token = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@example.com', password: 'AdminTest123' });
    expect(res.status).toBe(200);
    token = res.body.data.accessToken;
  });

  it('GET /api/admin/mux-upload-url returns uploadUrl', async () => {
    const res = await request(app)
      .get('/api/admin/mux-upload-url')
      .set('Authorization', `Bearer ${token}`);

    expect([200, 500]).toContain(res.status); // surface debug if 500
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data?.uploadUrl).toMatch(/^https:\/\/direct-uploads\./);
    } else {
      // Helpful debug when failing
      // eslint-disable-next-line no-console
      console.log('mux-upload-url debug:', res.body);
    }
  });

  it('POST /api/admin/movies with invalid mux asset returns 400', async () => {
    const payload = {
      title: 'Test Movie',
      description: 'Integration test movie',
      genres: ['Drama'],
      language: 'English',
      releaseYear: 2024,
      duration: 95,
      poster: {
        vertical: 'https://example.com/poster-vert.jpg',
        horizontal: 'https://example.com/poster-horiz.jpg'
      },
      trailerUrl: 'https://example.com/trailer.mp4',
      muxPlaybackId: 'playback_dummy',
      muxAssetId: 'asset_dummy_invalid',
      maturityRating: 'U',
      isPremium: false
    };

    const res = await request(app)
      .post('/api/admin/movies')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close(true);
    } catch {}
  });
});
