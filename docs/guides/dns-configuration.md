# DNS Configuration for syncedsports.com

## Overview
Configure DNS records to point your custom domain `syncedsports.com` to the deployed Cloud Run services.

## Current Cloud Run URLs
- **Backend**: https://sports-management-backend-140708809250.us-central1.run.app
- **Frontend**: https://sports-management-frontend-140708809250.us-central1.run.app

## Target Domain Mappings
- **api.syncedsports.com** → Backend service
- **syncedsports.com** → Frontend service

## Step 1: Set Up Domain Mappings in Google Cloud

First, create the domain mappings in Google Cloud:

```bash
# Set project context
export PROJECT_ID="syncedsports"
gcloud config set project $PROJECT_ID

# Create domain mapping for backend API
gcloud run domain-mappings create \
    --service=sports-management-backend \
    --domain=api.syncedsports.com \
    --region=us-central1

# Create domain mapping for frontend
gcloud run domain-mappings create \
    --service=sports-management-frontend \
    --domain=syncedsports.com \
    --region=us-central1

# Verify domain mappings were created
gcloud run domain-mappings list --region=us-central1
```

## Step 2: Configure DNS Records

Add these DNS records in your domain registrar's DNS management panel:

### For api.syncedsports.com (Backend)
```
Type: CNAME
Name: api
Value: ghs.googlehosted.com.
TTL: 300 (or default)
```

### For syncedsports.com (Frontend) - Option A: CNAME (Recommended)
If your DNS provider supports CNAME at root domain:
```
Type: CNAME
Name: @ (or leave blank for root)
Value: ghs.googlehosted.com.
TTL: 300 (or default)
```

### For syncedsports.com (Frontend) - Option B: A Records
If your DNS provider doesn't support CNAME at root, use A records:
```
Type: A
Name: @ (or leave blank for root)
Value: 216.239.32.21
TTL: 300 (or default)

Type: A
Name: @ (or leave blank for root)
Value: 216.239.34.21
TTL: 300 (or default)

Type: A
Name: @ (or leave blank for root)
Value: 216.239.36.21
TTL: 300 (or default)

Type: A
Name: @ (or leave blank for root)
Value: 216.239.38.21
TTL: 300 (or default)
```

### Optional: www Subdomain
```
Type: CNAME
Name: www
Value: ghs.googlehosted.com.
TTL: 300 (or default)
```

## Step 3: Update Frontend Environment Variables

Update the frontend to use the custom API domain:

```bash
# Update frontend service with custom API URL
gcloud run services update sports-management-frontend \
    --region=us-central1 \
    --set-env-vars="NEXT_PUBLIC_API_URL=https://api.syncedsports.com/api"

# Verify the update
gcloud run services describe sports-management-frontend --region=us-central1
```

## Step 4: Update Backend CORS Configuration

Update the backend to allow requests from the custom domain:

```bash
# Update backend service with custom frontend URL
gcloud run services update sports-management-backend \
    --region=us-central1 \
    --set-env-vars="FRONTEND_URL=https://syncedsports.com"
```

## Step 5: Verify DNS Propagation

Check that DNS records are properly configured:

```bash
# Check CNAME record for API subdomain
dig api.syncedsports.com CNAME

# Check A records for root domain (if using A records)
dig syncedsports.com A

# Check from different locations
nslookup api.syncedsports.com 8.8.8.8
nslookup syncedsports.com 8.8.8.8
```

## Step 6: Test Domain Mappings

Once DNS propagates (can take up to 24 hours), test the domains:

```bash
# Test backend API health
curl https://api.syncedsports.com/api/health

# Test frontend (should redirect or serve the app)
curl -I https://syncedsports.com

# Test specific API endpoints
curl https://api.syncedsports.com/api/leagues
curl https://api.syncedsports.com/api/games
```

## Step 7: SSL Certificate Verification

Google Cloud automatically provisions SSL certificates for custom domains:

```bash
# Check SSL certificate status
gcloud run domain-mappings describe api.syncedsports.com --region=us-central1
gcloud run domain-mappings describe syncedsports.com --region=us-central1

# Verify SSL in browser or with curl
curl -I https://api.syncedsports.com/api/health
curl -I https://syncedsports.com
```

## Common DNS Providers Configuration

### Cloudflare
1. Go to DNS settings in Cloudflare dashboard
2. Add CNAME record: `api` → `ghs.googlehosted.com`
3. For root domain, use CNAME flattening: `@` → `ghs.googlehosted.com`
4. Set Proxy status to "DNS only" (gray cloud) initially

### GoDaddy
1. Go to DNS Management in GoDaddy account
2. Add CNAME record: `api` → `ghs.googlehosted.com`
3. For root domain, use A records with the IPs listed above

### Namecheap
1. Go to Domain List → Manage → Advanced DNS
2. Add CNAME record: `api` → `ghs.googlehosted.com`
3. For root domain, add A records with the IPs listed above

### Google Domains
1. Go to DNS settings
2. Add CNAME record: `api` → `ghs.googlehosted.com`
3. Add CNAME record: `@` → `ghs.googlehosted.com` (if supported)

## Troubleshooting

### DNS Not Resolving
```bash
# Check if domain mapping exists
gcloud run domain-mappings list --region=us-central1

# Check DNS propagation status
dig +trace syncedsports.com
dig +trace api.syncedsports.com

# Use online DNS checker tools
# https://dnschecker.org/
```

### SSL Certificate Issues
```bash
# Check certificate status
gcloud run domain-mappings describe syncedsports.com --region=us-central1 --format="value(status.conditions)"

# Force certificate renewal (if needed)
gcloud run domain-mappings delete syncedsports.com --region=us-central1
# Wait 5 minutes, then recreate
gcloud run domain-mappings create --service=sports-management-frontend --domain=syncedsports.com --region=us-central1
```

### CORS Issues
```bash
# Test CORS from browser console
fetch('https://api.syncedsports.com/api/health')
  .then(response => console.log(response))
  .catch(error => console.error(error));

# Check if backend allows the frontend domain
curl -H "Origin: https://syncedsports.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.syncedsports.com/api/health
```

## Expected Timeline

- **DNS Propagation**: 5 minutes to 24 hours (typically 1-2 hours)
- **SSL Certificate**: 15 minutes to 2 hours after DNS resolves
- **Full Functionality**: Once both DNS and SSL are active

## Security Considerations

1. **SSL/TLS**: Google Cloud automatically provisions certificates
2. **HSTS**: Consider enabling HTTP Strict Transport Security
3. **Security Headers**: Verify CSP and other security headers are working
4. **Rate Limiting**: Ensure rate limiting is properly configured

## Monitoring

Set up monitoring for the custom domains:

```bash
# Create uptime checks
gcloud alpha monitoring uptime create \
    --display-name="Sports Management API" \
    --http-check-path="/api/health" \
    --hostname="api.syncedsports.com"

gcloud alpha monitoring uptime create \
    --display-name="Sports Management Frontend" \
    --http-check-path="/" \
    --hostname="syncedsports.com"
```

## Final Verification Checklist

- [ ] DNS records created and propagating
- [ ] Domain mappings created in Google Cloud
- [ ] SSL certificates provisioned and valid
- [ ] Frontend can reach backend via custom domains
- [ ] CORS configured properly
- [ ] Health checks passing
- [ ] All API endpoints accessible
- [ ] Frontend application loads correctly