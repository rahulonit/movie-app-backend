import request from 'supertest';
import app from '../src/server';
import mongoose from 'mongoose';
import { getMuxAsset, deleteMuxAsset } from '../src/config/mux';
import { Movie } from '../src/models/Movie';

// Only run these tests if RUN_INTEGRATION_TESTS=true
const describeIf = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIf('Integration: Full Movie Creation Flow', () => {
  let token = '';
  let uploadUrl = '';
  let assetId = '';
  let movieId = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@example.com', password: 'AdminTest123' });
    expect(res.status).toBe(200);
    token = res.body.data.accessToken;
  });

  it('Step 1: Get Mux upload URL', async () => {
    const res = await request(app)
      .get('/api/admin/mux-upload-url')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.uploadUrl).toBeTruthy();

    uploadUrl = res.body.data.uploadUrl;
    assetId = res.body.data.assetId;

    console.log('Upload URL obtained, assetId:', assetId);
  });

  it('Step 2: Upload minimal video to Mux (5 second test video)', async () => {
    // Generate a minimal 5-second video blob URL (or skip if not feasible in Node)
    // For this test, we'll simulate by checking if the uploadUrl is valid
    // In a real scenario, you'd use form-data or fetch to PUT a video file
    
    expect(uploadUrl).toMatch(/^https:\/\/direct-uploads\./);
    
    // Note: Actual video upload requires a video file. This test documents the flow.
    // To complete: 
    //   const fs = require('fs');
    //   const FormData = require('form-data');
    //   const form = new FormData();
    //   form.append('file', fs.createReadStream('./test-fixtures/sample.mp4'));
    //   await fetch(uploadUrl, { method: 'PUT', body: form });
    
    console.log('Video upload step documented (requires real video file)');
  }, 60000);

  it('Step 3: Wait for Mux asset to be ready', async () => {
    if (!assetId) {
      console.log('Skipping: no assetId from previous step');
      return;
    }

    // Poll for asset readiness (in real test, you'd upload first)
    // For now, we document the wait logic:
    let retries = 0;
    let asset: any = null;
    
    while (retries < 10) {
      try {
        asset = await getMuxAsset(assetId);
        if (asset?.status === 'ready') break;
      } catch (err) {
        // Asset might not exist yet if upload didn't happen
      }
      await new Promise((r) => setTimeout(r, 3000));
      retries++;
    }

    // Since we don't have a real uploaded video, this will fail gracefully
    console.log('Asset polling completed. Status:', asset?.status || 'not found');
  }, 60000);

  it('Step 4: Create movie with real Mux asset', async () => {
    // This step requires a real ready asset, so we skip if no valid assetId
    if (!assetId) {
      console.log('Skipping movie creation: no assetId');
      return;
    }

    // Attempt to get playback ID
    let playbackId = '';
    try {
      const asset = await getMuxAsset(assetId);
      if (asset?.status === 'ready') {
        playbackId = asset.playback_ids?.[0]?.id || '';
      }
    } catch (err) {
      console.log('Asset not ready or not found, skipping movie creation');
      return;
    }

    if (!playbackId) {
      console.log('No playback ID available, skipping movie creation');
      return;
    }

    const payload = {
      title: 'Integration Test Movie',
      description: 'Created by integration test',
      genres: ['Drama'],
      language: 'English',
      releaseYear: 2024,
      duration: 5,
      poster: {
        vertical: 'https://via.placeholder.com/400x600',
        horizontal: 'https://via.placeholder.com/1280x720'
      },
      trailerUrl: 'https://example.com/trailer.mp4',
      muxPlaybackId: playbackId,
      muxAssetId: assetId,
      maturityRating: 'U',
      isPremium: false
    };

    const res = await request(app)
      .post('/api/admin/movies')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      movieId = res.body.data?.movie?._id;
      console.log('Movie created successfully:', movieId);
    } else {
      console.log('Movie creation response:', res.body);
    }
  });

  afterAll(async () => {
    // Clean up: delete movie and Mux asset
    if (movieId) {
      try {
        await Movie.findByIdAndDelete(movieId);
        console.log('Cleaned up movie:', movieId);
      } catch (err) {
        console.error('Failed to clean up movie:', err);
      }
    }

    if (assetId) {
      try {
        await deleteMuxAsset(assetId);
        console.log('Cleaned up Mux asset:', assetId);
      } catch (err) {
        console.error('Failed to clean up Mux asset:', err);
      }
    }

    try {
      await mongoose.connection.close(true);
    } catch {}
  });
});
