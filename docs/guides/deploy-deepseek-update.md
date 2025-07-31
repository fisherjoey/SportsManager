# DeepSeek API Configuration and Backend Update

## Current Status
- Backend code has been converted to use DeepSeek API
- DeepSeek API key needs to be added to Google Secret Manager
- Backend service needs to be updated with the new environment variable
- Backend needs to be redeployed to pick up the changes

## Step 1: Add DeepSeek API Key to Secret Manager

```bash
# Set project context
export PROJECT_ID="syncedsports"
gcloud config set project $PROJECT_ID

# Create the DeepSeek API key secret
echo -n "sk-3f199ffb68a742aebccd7df278e9f1a9" | gcloud secrets create deepseek-api-key --data-file=-

# Verify the secret was created
gcloud secrets list | grep deepseek-api-key

# Grant the Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding deepseek-api-key \
    --member="serviceAccount:140708809250-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Step 2: Update Backend Service Environment Variables

Update the backend Cloud Run service to use the DeepSeek API key:

```bash
# Update the backend service with DeepSeek configuration
gcloud run services update sports-management-backend \
    --region=us-central1 \
    --set-env-vars="NODE_ENV=production,PORT=3001" \
    --set-secrets="DEEPSEEK_API_KEY=deepseek-api-key:latest" \
    --set-env-vars="DEEPSEEK_MODEL=deepseek-chat"

# Verify the service was updated
gcloud run services describe sports-management-backend --region=us-central1
```

## Step 3: Alternative - Redeploy Backend with Updated Environment

If you prefer to redeploy from source with the new configuration:

```bash
# Navigate to the project root
cd "/Users/admin/Desktop/Sports Management App"

# Create a production environment file for the backend
cat > backend/.env.production << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sports_user:\${DB_PASSWORD}@localhost:5432/sports_management?host=/cloudsql/syncedsports:us-central1:sports-management-db
DEEPSEEK_API_KEY=sk-3f199ffb68a742aebccd7df278e9f1a9
DEEPSEEK_MODEL=deepseek-chat
FRONTEND_URL=https://syncedsports.com
JWT_SECRET=\${JWT_SECRET}
EOF

# Redeploy the backend using Cloud Build
gcloud builds submit --config=deploy/cloudbuild-backend.yaml .
```

## Step 4: Verify DeepSeek Integration

Test that the DeepSeek API is working properly:

```bash
# Check backend health
curl https://sports-management-backend-140708809250.us-central1.run.app/api/health

# Test AI assignment suggestions endpoint (if available)
curl -X POST https://sports-management-backend-140708809250.us-central1.run.app/api/ai-suggestions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{"gameId": "test-game-id"}'

# Check backend logs for any errors
gcloud logs tail sports-management-backend --limit=50 --region=us-central1
```

## Step 5: Test AI Functionality

The backend should now support these AI-powered features:

### AI Assignment Suggestions
- Endpoint: `POST /api/ai-suggestions`
- Uses DeepSeek to suggest referee assignments based on:
  - Game requirements
  - Referee availability
  - Geographic proximity
  - Past performance

### Receipt Processing (Financial Management)
- Endpoint: `POST /api/expenses/receipts/process`
- Uses DeepSeek to extract data from receipt images
- Automatic expense categorization
- Cost tracking and budget analysis

### Organizational Analytics
- Smart analytics for referee performance
- Game assignment optimization
- Financial insights and reporting

## Environment Variables Now Available

The backend now has access to these DeepSeek-related environment variables:

```bash
DEEPSEEK_API_KEY=sk-3f199ffb68a742aebccd7df278e9f1a9
DEEPSEEK_MODEL=deepseek-chat  # Default model
```

## Expected Behavior

After the update, the backend should:
1. Successfully initialize DeepSeek client on startup
2. AI-powered endpoints should return proper responses
3. Logs should show "DeepSeek AI service initialized" (if implemented)
4. No OpenAI-related errors in the logs

## Troubleshooting

### DeepSeek API Issues
```bash
# Check if secret is accessible
gcloud secrets versions access latest --secret="deepseek-api-key"

# Test DeepSeek API directly
curl -X POST https://api.deepseek.com/v1/chat/completions \
    -H "Authorization: Bearer sk-3f199ffb68a742aebccd7df278e9f1a9" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": "Hello"}],
        "max_tokens": 10
    }'
```

### Service Update Issues
```bash
# Check service status
gcloud run services list --region=us-central1

# View detailed service configuration
gcloud run services describe sports-management-backend --region=us-central1

# Check service logs for startup issues
gcloud logs tail sports-management-backend --limit=100 --region=us-central1
```

### Rollback if Needed
```bash
# Rollback to previous revision if there are issues
gcloud run services update sports-management-backend \
    --region=us-central1 \
    --image=gcr.io/syncedsports/sports-management-backend:previous-tag
```

## Cost Monitoring

DeepSeek API pricing is very competitive:
- **$0.2 per 1M tokens** for deepseek-chat model
- Monitor usage through backend logs and DeepSeek dashboard
- The backend includes cost estimation for AI operations

## Next Steps

After DeepSeek configuration is complete:
1. Test AI assignment suggestions
2. Verify receipt processing functionality
3. Configure DNS records for custom domain
4. Test complete system functionality