import request from 'supertest';
import app from '../src/server';
import mongoose from 'mongoose';

describe('API Health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close(true);
    } catch {}
  });
});
