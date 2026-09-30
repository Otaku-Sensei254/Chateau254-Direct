# Chateau254 Backend

Express and PostgreSQL API for the Chateau254 customer, admin, and rider applications.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your local PostgreSQL or Neon connection string.
3. Create the database schema:

```bash
npm run db:schema

# Seed the admin and rider accounts
npm run db:seed
```

For menu image uploads, configure the following Railway variables (or local `.env` values):

```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=chateau254
R2_PUBLIC_URL=https://<public-r2-domain>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_MAX_FILE_SIZE=5242880
```

The upload endpoint is admin-only: `POST /api/menu/upload` with a multipart field named `image`. It accepts JPEG, PNG, and WebP files up to 5 MB.

4. Start the development server:

```bash
npm run dev
```

The API runs at `http://localhost:5000` by default.

The development seed creates the admin account `admin@chateau254.com` with password `chateau254@1234` and four rider accounts. Change seeded credentials before using this outside local development.

## API routes

- `GET /api/health`
- `GET /api/health/db`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET|POST /api/menu`
- `PATCH|DELETE /api/menu/:id`
- `GET|POST /api/orders`
- `PATCH /api/orders/:id/status`
- `GET /api/customers`
- `PATCH /api/customers/:id/points`
- `GET|POST /api/riders`
- `PATCH /api/riders/:id/status`
- `DELETE /api/riders/:id`
