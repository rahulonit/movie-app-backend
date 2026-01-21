# OTT Streaming Platform - Backend

Production-grade Netflix-style OTT streaming backend built with Node.js, Express, MongoDB, Cloudinary, and Mux.

## 🚀 Features

- **JWT Authentication** with refresh tokens
- **Role-Based Access Control** (USER/ADMIN)
- **Multi-Profile Support** (up to 5 profiles per account)
- **Subscription Management** (FREE/PREMIUM)
- **Content Management** (Movies & Series)
- **Video Streaming** via Mux HLS
- **Media Storage** via Cloudinary
- **Watch History & Resume Playback**
- **My List (Watchlist)**
- **Search & Filters**
- **Admin Dashboard** with analytics
- **Content Analytics**
- **User Management**

## 🛠️ Tech Stack

- **Node.js** + **Express.js**
- **TypeScript**
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Cloudinary** for image storage
- **Mux** for video streaming
- **bcrypt** for password hashing

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- Cloudinary account
- Mux account

## ⚙️ Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Environment Setup:**
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. **Configure environment variables:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

4. **Run the server:**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 📚 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/home` | Get home feed |
| GET | `/api/movies/:id` | Get movie by ID |
| GET | `/api/series/:id` | Get series by ID |
| GET | `/api/search` | Search content |
| GET | `/api/movies/genre/:genre` | Get movies by genre |

### User Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/profiles` | Create profile |
| GET | `/api/profiles` | Get all profiles |
| PUT | `/api/profiles/:id` | Update profile |
| DELETE | `/api/profiles/:id` | Delete profile |
| POST | `/api/my-list/add` | Add to My List |
| POST | `/api/my-list/remove` | Remove from My List |
| GET | `/api/my-list/:profileId` | Get My List |
| POST | `/api/progress/update` | Update watch progress |
| GET | `/api/watch-history/:profileId` | Get watch history |

### Admin - Content Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/upload-image` | Upload image to Cloudinary |
| GET | `/api/admin/mux-upload-url` | Get Mux upload URL |
| POST | `/api/admin/movies` | Create movie |
| GET | `/api/admin/movies` | Get all movies |
| PUT | `/api/admin/movies/:id` | Update movie |
| DELETE | `/api/admin/movies/:id` | Delete movie |
| POST | `/api/admin/series` | Create series |
| GET | `/api/admin/series` | Get all series |
| PUT | `/api/admin/series/:id` | Update series |
| DELETE | `/api/admin/series/:id` | Delete series |
| POST | `/api/admin/series/:id/seasons` | Add season |
| POST | `/api/admin/series/:id/seasons/:seasonNum/episodes` | Add episode |
| DELETE | `/api/admin/series/:id/seasons/:seasonNum/episodes/:episodeId` | Delete episode |

### Admin - Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics/dashboard` | Dashboard metrics |
| GET | `/api/admin/analytics/views-per-day` | Views per day (30 days) |
| GET | `/api/admin/analytics/top-content` | Top 10 content |
| GET | `/api/admin/analytics/content-distribution` | Movies vs Series |
| GET | `/api/admin/analytics/genre-distribution` | Genre distribution |
| GET | `/api/admin/analytics/user-growth` | User growth (30 days) |
| GET | `/api/admin/analytics/content/:type/:id` | Content performance |

### Admin - User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get all users |
| GET | `/api/admin/users/:id` | Get user by ID |
| GET | `/api/admin/users/:id/stats` | Get user statistics |
| PUT | `/api/admin/users/:id/subscription` | Update subscription |
| PUT | `/api/admin/users/:id/block` | Block/Unblock user |
| DELETE | `/api/admin/users/:id` | Delete user |

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT access tokens (15min expiry)
- JWT refresh tokens (7 day expiry)
- Role-based authorization
- Rate limiting
- Helmet.js security headers
- CORS configuration
- Request validation

## 📊 Database Schema

### User
- Email/Password authentication
- Role (USER/ADMIN)
- Subscription (plan, status, expiresAt)
- Multiple profiles
- Watch history per profile
- My List per profile

### Movie
- Title, description, genres
- Language, release year
- Duration, rating
- Posters (vertical/horizontal)
- Mux playback ID
- Maturity rating
- Premium flag
- Views counter

### Series
- Title, description, genres
- Language, release year
- Posters
- Seasons array
  - Episodes array
    - Title, description
    - Mux playback ID
    - Thumbnail
    - Views

## 🌐 Cloud Services Integration

### Cloudinary
- Image uploads
- Automatic optimization
- CDN delivery
- Format conversion (WebP/AVIF)

### Mux
- Video uploads
- HLS encoding
- Secure streaming
- Analytics
- Multiple quality levels

## 🚀 Deployment

1. Build the project:
```bash
npm run build
```

2. Set production environment variables

3. Deploy to your preferred platform:
   - AWS EC2
   - Digital Ocean
   - Heroku
   - Railway
   - Render

## 📝 License

MIT

## 👨‍💻 Author

Your Name

---

cd backend
PORT=5002 MUX_TOKEN_ID=test MUX_TOKEN_SECRET=test JWT_SECRET=secret JWT_REFRESH_SECRET=refresh JWT_EXPIRE=15m JWT_REFRESH_EXPIRE=7d MONGODB_URI=mongodb://127.0.0.1:27017/ott-streaming NODE_ENV=development npm run start

Built with ❤️ for production-grade OTT streaming
