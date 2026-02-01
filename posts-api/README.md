# shrd Posts API

Drop-in posts API for any Next.js site. Receive content from shrd.co and publish to your blog.

## Quick Setup

### 1. Add Prisma Schema

Add to your `prisma/schema.prisma`:

```prisma
model Post {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  title       String
  slug        String   @unique
  content     String   @db.Text
  excerpt     String?
  
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  
  // Source tracking
  sourceUrl   String?
  sourcePlatform String?
  
  // SEO
  metaTitle   String?
  metaDescription String?
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### 2. Copy API Routes

Copy the `src/app/api/posts` folder to your project.

### 3. Add Environment Variable

```bash
# Generate a secure API key
openssl rand -hex 32

# Add to .env
SHRD_API_KEY=your-generated-key
```

### 4. Configure shrd.co

Add to your shrd.co environment:
```
HRVSTR_API_URL=https://hrvstr.com
HRVSTR_API_KEY=your-generated-key
```

## API Endpoints

### POST /api/posts
Create a new post (draft by default).

```json
{
  "title": "Post Title",
  "content": "Markdown content...",
  "status": "draft",
  "metadata": {
    "source": "https://youtube.com/...",
    "platform": "youtube"
  }
}
```

### GET /api/posts
List posts with optional filters.

```
GET /api/posts?status=PUBLISHED&limit=10
```

### GET /api/posts/[slug]
Get a single post by slug.

### PATCH /api/posts/[slug]
Update a post.

### DELETE /api/posts/[slug]
Delete a post.

## Authentication

Include API key in header:
```
Authorization: Bearer your-api-key
```
