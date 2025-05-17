# Dominion Store Setup Guide

## Prerequisites

- Node.js 18 or later
- PostgreSQL 14 or later
- Redis 6 or later
- Elasticsearch 8 (optional, for advanced search)

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-repo/dominion-store.git
cd dominion-store
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/dominion_store"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Next Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Payment Providers
PAYSTACK_SECRET_KEY="your-paystack-secret"
PAYSTACK_PUBLIC_KEY="your-paystack-public"
FLUTTERWAVE_SECRET_KEY="your-flutterwave-secret"
FLUTTERWAVE_PUBLIC_KEY="your-flutterwave-public"

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="your-aws-region"
AWS_BUCKET_NAME="your-bucket-name"

# Elasticsearch
ELASTICSEARCH_URL="http://localhost:9200"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start development server:
```bash
npm run dev
```

## Docker Setup

1. Run required services:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL
- Redis
- Elasticsearch
- MinIO (S3-compatible storage)

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Environment Variables

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis host
- `NEXTAUTH_SECRET`: NextAuth.js secret key
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

### Optional Variables
- `ELASTICSEARCH_URL`: Elasticsearch connection URL
- `CDN_DOMAIN`: Custom CDN domain for assets
- `SMTP_HOST`: SMTP server for emails
- `SENTRY_DSN`: Sentry error tracking

## Features

1. Image Optimization
- Automatic image resizing
- Format conversion (WebP, AVIF)
- CDN integration
- Lazy loading

2. Product Management
- Bulk import/export
- Variant management
- Dynamic pricing
- Bundle creation

3. Error Handling
- Error boundaries
- Loading states
- Retry mechanisms
- Error logging

## Troubleshooting

### Common Issues

1. Database Connection
```bash
# Check PostgreSQL status
sudo service postgresql status

# Reset database
npx prisma db push --force-reset
```

2. Redis Connection
```bash
# Check Redis status
redis-cli ping

# Flush Redis
redis-cli flushall
```

3. Image Upload Issues
```bash
# Check S3 bucket permissions
aws s3 ls s3://your-bucket-name

# Clear image cache
rm -rf .next/cache/images
```

## Security Considerations

1. API Security
- Rate limiting enabled
- CORS configured
- Input validation
- XSS protection

2. Data Security
- Encrypted environment variables
- Secure session handling
- Password hashing
- HTTPS enforced

## Monitoring

1. Performance Monitoring
- Server metrics
- API response times
- Error rates
- Cache hit rates

2. Error Tracking
- Error logging
- Stack traces
- User context
- Environment info