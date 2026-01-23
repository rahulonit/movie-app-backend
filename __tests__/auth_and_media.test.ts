import request from 'supertest';
import app from '../src/server';
import mongoose from 'mongoose';

describe('Admin Auth & Media Integrations', () => {
  let token: string = '';

  it('POST /api/auth/login returns admin token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@example.com', password: 'AdminTest123' });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.accessToken).toBeTruthy();
    token = res.body.data.accessToken;
  });

  it('GET /api/admin/integrations/health returns ok', async () => {
    const res = await request(app)
      .get('/api/admin/integrations/health')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.cloudinary?.ok).toBe(true);
    expect(res.body?.data?.mux?.ok).toBe(true);
  });

  afterAll(async () => {
    try {
      await mongoose.connection.close(true);
    } catch {}
  });
});
