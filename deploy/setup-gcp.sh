#!/bin/bash

# Google Cloud Deployment Setup Script for Sports Management App
# This script sets up the infrastructure for deploying to Google Cloud Platform

set -e

# Configuration
PROJECT_ID="syncedsports"
REGION="us-central1"
DB_INSTANCE_NAME="sports-management-db"
DB_NAME="sports_management"
DB_USER="sports_user"

echo "🚀 Sports Management App - Google Cloud Setup"
echo "=============================================="

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Please set PROJECT_ID in this script"
    exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "📋 Using Project ID: $PROJECT_ID"
echo "📍 Region: $REGION"

# Set the project
echo "🔧 Setting up project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com \
    run.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    containerregistry.googleapis.com \
    cloudresourcemanager.googleapis.com

# Create Cloud SQL instance
echo "🗄️  Creating Cloud SQL PostgreSQL instance..."
if ! gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=02:00 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=03 \
        --deletion-protection
    echo "✅ Cloud SQL instance created"
else
    echo "ℹ️  Cloud SQL instance already exists"
fi

# Create database
echo "📚 Creating database..."
if ! gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME
    echo "✅ Database created"
else
    echo "ℹ️  Database already exists"
fi

# Create database user
echo "👤 Creating database user..."
DB_PASSWORD=$(openssl rand -base64 32)
if ! gcloud sql users describe $DB_USER --instance=$DB_INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE_NAME \
        --password=$DB_PASSWORD
    echo "✅ Database user created"
    echo "🔑 Database password: $DB_PASSWORD"
    echo "⚠️  IMPORTANT: Save this password securely!"
else
    echo "ℹ️  Database user already exists"
    echo "🔑 To reset password, run:"
    echo "   gcloud sql users set-password $DB_USER --instance=$DB_INSTANCE_NAME --password=NEW_PASSWORD"
fi

# Get database connection string
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)")
echo "🔗 Database connection name: $DB_CONNECTION_NAME"

# Create Secret Manager secrets for sensitive data
echo "🔐 Creating secrets in Secret Manager..."
gcloud services enable secretmanager.googleapis.com

# Database URL secret
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?host=/cloudsql/$DB_CONNECTION_NAME"
echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=- || echo "ℹ️  Database URL secret already exists"

# JWT Secret
JWT_SECRET=$(openssl rand -base64 64)
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- || echo "ℹ️  JWT secret already exists"

# Grant Cloud Run access to secrets
echo "🔓 Granting Cloud Run access to secrets..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_RUN_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding database-url \
    --member="serviceAccount:$CLOUD_RUN_SA" \
    --role="roles/secretmanager.secretAccessor" || true

gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:$CLOUD_RUN_SA" \
    --role="roles/secretmanager.secretAccessor" || true

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Update your environment variables in Cloud Run services"
echo "2. Run migrations on the Cloud SQL database"
echo "3. Deploy your application using Cloud Build"
echo ""
echo "🔧 Useful Commands:"
echo "Deploy backend:"
echo "  gcloud builds submit --config=deploy/cloudbuild-backend.yaml ."
echo ""
echo "Deploy frontend:"
echo "  gcloud builds submit --config=deploy/cloudbuild-frontend.yaml ."
echo ""
echo "Connect to database:"
echo "  gcloud sql connect $DB_INSTANCE_NAME --user=$DB_USER --database=$DB_NAME"
echo ""
echo "📊 Resources Created:"
echo "- Cloud SQL instance: $DB_INSTANCE_NAME"
echo "- Database: $DB_NAME"
echo "- Database user: $DB_USER"
echo "- Connection name: $DB_CONNECTION_NAME"
echo "- Secrets: database-url, jwt-secret"