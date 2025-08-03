# Google Cloud Platform Deployment Guide

This guide will help you deploy the Sports Management App to Google Cloud Platform using Cloud Run and Cloud SQL.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Docker** installed locally (for testing)
4. **Domain name** (optional, for custom domain)

## Architecture Overview

- **Frontend**: Next.js app on Cloud Run
- **Backend**: Node.js/Express API on Cloud Run  
- **Database**: PostgreSQL on Cloud SQL
- **Secrets**: Google Secret Manager
- **Container Registry**: Google Container Registry

## Step-by-Step Deployment

### 1. Initial Setup

```bash
# Clone your repository
git clone https://github.com/fisherjoey/SportsManager.git
cd SportsManager

# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create your-project-id --name="Sports Management App"
gcloud config set project your-project-id

# Enable billing for the project (required)
# Go to: https://console.cloud.google.com/billing
```

### 2. Run Infrastructure Setup

```bash
# Edit the setup script to add your project ID
nano deploy/setup-gcp.sh
# Set: PROJECT_ID="your-project-id"

# Run the setup script
./deploy/setup-gcp.sh
```

This script will:
- Enable required Google Cloud APIs
- Create Cloud SQL PostgreSQL instance
- Create database and user
- Set up Secret Manager for sensitive data
- Configure IAM permissions

### 3. Update Environment Variables

After setup, update your environment files:

**Backend (`backend/.env.production`):**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sports_user:PASSWORD@localhost:5432/sports_management?host=/cloudsql/PROJECT_ID:us-central1:sports-management-db
FRONTEND_URL=https://your-frontend-url
JWT_SECRET=your-generated-jwt-secret
```

**Frontend:**
Create `.env.production.local`:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url/api
```

### 4. Deploy Backend

```bash
# Build and deploy backend
gcloud builds submit --config=deploy/cloudbuild-backend.yaml .

# The backend will be available at:
# https://sports-management-backend-HASH-uc.a.run.app
```

### 5. Run Database Migrations

```bash
# Connect to your Cloud SQL instance
gcloud sql connect sports-management-db --user=sports_user --database=sports_management

# Or run migrations from local machine with Cloud SQL Proxy
# Download Cloud SQL Proxy
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
chmod +x cloud_sql_proxy

# Run proxy in background
./cloud_sql_proxy -instances=PROJECT_ID:us-central1:sports-management-db=tcp:5432 &

# Run migrations
cd backend
DATABASE_URL="postgresql://sports_user:PASSWORD@localhost:5432/sports_management" npm run migrate
DATABASE_URL="postgresql://sports_user:PASSWORD@localhost:5432/sports_management" npm run seed
```

### 6. Deploy Frontend

```bash
# Update frontend environment variables with backend URL
echo "NEXT_PUBLIC_API_URL=https://sports-management-backend-HASH-uc.a.run.app/api" > .env.production.local

# Build and deploy frontend
gcloud builds submit --config=deploy/cloudbuild-frontend.yaml .

# The frontend will be available at:
# https://sports-management-frontend-HASH-uc.a.run.app
```

### 7. Configure Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run services
gcloud run domain-mappings create --service=sports-management-frontend --domain=app.yourdomain.com
gcloud run domain-mappings create --service=sports-management-backend --domain=api.yourdomain.com
```

### 8. Configure Environment Variables in Cloud Run

```bash
# Update backend service with environment variables
gcloud run services update sports-management-backend \
  --set-env-vars="NODE_ENV=production,PORT=3001,FRONTEND_URL=https://app.yourdomain.com" \
  --set-secrets="DATABASE_URL=database-url:latest,JWT_SECRET=jwt-secret:latest"

# Update frontend service
gcloud run services update sports-management-frontend \
  --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api"
```

## Post-Deployment Tasks

### 1. Create Admin User

```bash
# Connect to database and create admin user
gcloud sql connect sports-management-db --user=sports_user --database=sports_management

# In PostgreSQL shell:
INSERT INTO users (id, email, password, role, name, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'admin@yourdomain.com',
  '$2b$10$encrypted_password_hash',
  'admin',
  'System Administrator',
  NOW(),
  NOW()
);
```

### 2. Configure DNS

Point your domain to the Cloud Run URLs:
- `A` record for `app.yourdomain.com` → Cloud Run frontend
- `A` record for `api.yourdomain.com` → Cloud Run backend

### 3. Set Up Monitoring

```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com logging.googleapis.com

# Create uptime checks
gcloud alpha monitoring uptime create \
  --display-name="Sports Management App" \
  --http-check-path="/health" \
  --hostname="api.yourdomain.com"
```

## Scaling and Performance

### Auto-scaling Configuration

```bash
# Configure auto-scaling
gcloud run services update sports-management-backend \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80

gcloud run services update sports-management-frontend \
  --min-instances=0 \
  --max-instances=5 \
  --concurrency=100
```

### Database Scaling

```bash
# Upgrade database tier if needed
gcloud sql instances patch sports-management-db \
  --tier=db-standard-1
```

## Security Best Practices

1. **Enable VPC Connector** for private database access
2. **Use Cloud Armor** for DDoS protection
3. **Enable Cloud CDN** for static assets
4. **Set up SSL certificates** for custom domains
5. **Configure backup schedules** for Cloud SQL
6. **Use Cloud IAM** for fine-grained access control

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check Cloud SQL instance status
   gcloud sql instances describe sports-management-db
   
   # Check service logs
   gcloud logs tail sports-management-backend
   ```

2. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log BUILD_ID
   ```

3. **Service Not Starting**
   ```bash
   # Check service configuration
   gcloud run services describe sports-management-backend
   ```

### Useful Commands

```bash
# View logs
gcloud logs tail sports-management-backend --follow

# Scale service
gcloud run services update sports-management-backend --memory=2Gi --cpu=2

# Update environment variables
gcloud run services update sports-management-backend \
  --update-env-vars="NEW_VAR=value"

# Rollback deployment
gcloud run services update sports-management-backend \
  --image=gcr.io/PROJECT_ID/sports-management-backend:PREVIOUS_SHA
```

## Cost Optimization

1. **Use minimum instance counts** for non-critical services
2. **Set appropriate CPU and memory limits**
3. **Use Cloud SQL automatic storage increases**
4. **Enable request-based pricing** for Cloud Run
5. **Set up billing alerts** and budgets

## Support

For deployment issues:
1. Check Google Cloud Status page
2. Review service logs in Cloud Console
3. Check Cloud Build history
4. Verify IAM permissions
5. Test database connectivity

---

**Estimated Monthly Costs** (USD):
- Cloud Run Backend: $5-20
- Cloud Run Frontend: $0-10  
- Cloud SQL (db-f1-micro): $7-15
- Container Registry: $0-5
- **Total: $12-50/month** (depending on traffic)

For production workloads, consider upgrading to higher tiers as needed.