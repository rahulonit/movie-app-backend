# Backend Testing

## Running Tests

### Unit & Smoke Tests
```bash
npm test
```

This runs all unit and smoke tests including:
- API health check
- Admin authentication
- Media integrations (Cloudinary & Mux)
- Mux upload URL generation
- Movie creation validation

### Integration Tests (Opt-in)

Integration tests upload real videos to Mux and create movies in the database. They require:
- Valid Mux credentials in `.env`
- Active database connection
- Test video files

To run integration tests:
```bash
RUN_INTEGRATION_TESTS=true npm test
```

**Note:** Integration tests may incur Mux API usage and will create/delete assets and movies.

## Test Structure

- `__tests__/health.test.ts` - Basic API health checks
- `__tests__/auth_and_media.test.ts` - Authentication and media integration tests
- `__tests__/admin_movies.test.ts` - Movie CRUD validation tests
- `__tests__/integration_movie_creation.test.ts` - Full end-to-end flow (opt-in)

## Coverage

Current tests verify:
- ✅ API endpoints respond correctly
- ✅ Authentication & authorization
- ✅ Cloudinary & Mux connectivity
- ✅ Mux upload URL generation
- ✅ Movie validation with invalid assets
- 📋 Full movie creation flow (requires opt-in flag + test video)

## CI/CD

For CI pipelines, run:
```bash
npm test
```

Only enable `RUN_INTEGRATION_TESTS=true` in staging/pre-production environments with proper credentials.
