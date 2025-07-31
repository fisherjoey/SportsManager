# Complete System Testing Guide

## Overview
This guide provides comprehensive testing steps to verify the complete Sports Management App deployment on Google Cloud Platform.

## Prerequisites
- Database migrations completed
- CMBA season data seeded
- DeepSeek API key configured
- DNS records configured (if using custom domain)

## Test URLs
- **Backend**: https://sports-management-backend-140708809250.us-central1.run.app
- **Frontend**: https://sports-management-frontend-140708809250.us-central1.run.app
- **Custom Backend** (after DNS): https://api.syncedsports.com
- **Custom Frontend** (after DNS): https://syncedsports.com

## Phase 1: Infrastructure Health Checks

### 1.1 Backend Health Check
```bash
# Test backend health endpoint
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/health

# Expected Response:
# {"status": "healthy", "timestamp": "2025-07-30T...", "database": "connected"}
```

### 1.2 Database Connectivity
```bash
# Test database-dependent endpoints
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/leagues

# Expected: JSON array of leagues
# Should include CMBA leagues from seed data
```

### 1.3 Frontend Loading
```bash
# Test frontend health
curl -I https://sports-management-frontend-140708809250.us-central1.run.app

# Expected: HTTP 200 status with HTML content type
```

## Phase 2: Authentication System Testing

### 2.1 Admin User Login
The CMBA seed data creates an admin user:
- **Email**: admin@cmba.ca  
- **Password**: password123

Test login via frontend or API:

```bash
# API Login Test
curl -X POST https://sports-management-backend-140708809250.us-central1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@cmba.ca",
    "password": "password123"
  }'

# Expected Response: JWT token and user info
# Save the token for subsequent tests
export JWT_TOKEN="your-jwt-token-here"
```

### 2.2 Protected Route Access
```bash
# Test protected endpoint with JWT
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/referees \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: JSON array of referees
```

## Phase 3: Core Data Endpoints

### 3.1 Leagues and Teams
```bash
# Get all leagues
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/leagues \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get teams for a specific league
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/teams?league_id=LEAGUE_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 3.2 Games Management
```bash
# Get all games
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/games \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get specific game details
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/games/GAME_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 3.3 Referees and Assignments
```bash
# Get all referees
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/referees \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get game assignments
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/assignments \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Phase 4: AI-Powered Features Testing

### 4.1 DeepSeek AI Assignment Suggestions
```bash
# Test AI assignment suggestions (requires game ID from Phase 3.2)
curl -X POST https://sports-management-backend-140708809250.us-central1.run.app/api/ai-suggestions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "gameId": "GAME_ID_FROM_PREVIOUS_TEST",
    "requirements": {
      "refereeCount": 2,
      "level": "Junior"
    }
  }'

# Expected: AI-generated assignment suggestions with reasoning
```

### 4.2 Receipt Processing (if implemented)
```bash
# Test AI receipt processing endpoint
curl -X POST https://sports-management-backend-140708809250.us-central1.run.app/api/expenses/receipts/process \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "receipt=@/path/to/test/receipt.jpg"

# Expected: Extracted expense data from image
```

## Phase 5: Frontend User Interface Testing

### 5.1 Frontend Loading Test
Open in browser: https://sports-management-frontend-140708809250.us-central1.run.app

**Verify:**
- [ ] Page loads without errors
- [ ] Login form appears
- [ ] No console errors in browser dev tools
- [ ] Responsive design works on mobile

### 5.2 Login Flow Test
1. Navigate to login page
2. Enter credentials: admin@cmba.ca / password123
3. Verify successful login and redirect to dashboard

### 5.3 Dashboard Functionality
After login, verify:
- [ ] Dashboard loads with data
- [ ] Games table displays CMBA games
- [ ] Referees table shows referee data  
- [ ] Navigation menu works
- [ ] Logout functionality works

### 5.4 Core Features Test
Test key user workflows:
- [ ] View and filter games
- [ ] View referee profiles
- [ ] Create/edit game assignments
- [ ] AI assignment suggestions (if UI implemented)
- [ ] Calendar view functionality

## Phase 6: Performance and Security Testing

### 6.1 Performance Checks
```bash
# Test response times
time curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/games \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: Response time < 2 seconds for most endpoints
```

### 6.2 Security Headers
```bash
# Check security headers
curl -I https://sports-management-backend-140708809250.us-central1.run.app/api/health

# Verify presence of:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
```

### 6.3 CORS Testing
```bash
# Test CORS from different origin
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://sports-management-backend-140708809250.us-central1.run.app/api/health

# Should return appropriate CORS headers
```

## Phase 7: Custom Domain Testing (After DNS Configuration)

### 7.1 Custom Domain Connectivity
```bash
# Test custom API domain
curl -X GET https://api.syncedsports.com/api/health

# Test custom frontend domain
curl -I https://syncedsports.com

# Both should work identically to the .run.app URLs
```

### 7.2 SSL Certificate Verification
```bash
# Check SSL certificate
openssl s_client -connect api.syncedsports.com:443 -servername api.syncedsports.com < /dev/null 2>/dev/null | openssl x509 -text -noout | grep -A2 "Subject:"

# Verify certificate is issued by Google Trust Services
```

## Phase 8: Error Handling and Edge Cases

### 8.1 Invalid Authentication
```bash
# Test with invalid token
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/referees \
  -H "Authorization: Bearer invalid-token"

# Expected: 401 Unauthorized
```

### 8.2 Non-existent Resources
```bash
# Test non-existent game
curl -X GET https://sports-management-backend-140708809250.us-central1.run.app/api/games/non-existent-id \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: 404 Not Found
```

### 8.3 Malformed Requests
```bash
# Test malformed JSON
curl -X POST https://sports-management-backend-140708809250.us-central1.run.app/api/games \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"invalid": json}'

# Expected: 400 Bad Request with validation errors
```

## Monitoring and Logging

### Check Application Logs
```bash
# View backend logs
gcloud logs tail sports-management-backend --limit=50 --region=us-central1

# View frontend logs  
gcloud logs tail sports-management-frontend --limit=50 --region=us-central1

# Filter for errors
gcloud logs read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=20
```

### Monitor Resource Usage
```bash
# Check Cloud Run metrics
gcloud run services describe sports-management-backend --region=us-central1 --format="value(status.traffic)"

# Check database connections
gcloud sql instances describe sports-management-db
```

## Expected Results Summary

After successful testing, you should have:

1. **✅ Database**: All tables created with CMBA season data
2. **✅ Authentication**: Admin login working (admin@cmba.ca)
3. **✅ API Endpoints**: All core endpoints returning data
4. **✅ AI Features**: DeepSeek integration functional
5. **✅ Frontend**: Web app loading and functioning
6. **✅ Security**: Proper headers and authentication
7. **✅ Performance**: Response times under 2 seconds
8. **✅ Custom Domain**: Working after DNS propagation
9. **✅ SSL**: Valid certificates for all domains
10. **✅ Error Handling**: Proper error responses

## Troubleshooting Common Issues

### Database Connection Errors
```bash
# Check Cloud SQL instance status
gcloud sql instances describe sports-management-db

# Verify database user and permissions
gcloud sql users list --instance=sports-management-db
```

### Authentication Failures
- Verify JWT_SECRET is set in backend environment
- Check user exists in database
- Ensure password hash is correct

### AI Feature Errors
- Verify DEEPSEEK_API_KEY is set and valid
- Check DeepSeek API quota and limits
- Review backend logs for AI service errors

### Frontend Not Loading
- Check NEXT_PUBLIC_API_URL environment variable
- Verify CORS configuration allows frontend domain
- Check browser console for JavaScript errors

## Final Validation

The system is ready for production use when:
- [ ] All health checks pass
- [ ] User authentication works end-to-end
- [ ] Core sports management features functional
- [ ] AI assignment suggestions working
- [ ] Frontend application fully operational
- [ ] Custom domain (if configured) working
- [ ] No critical errors in logs
- [ ] Performance meets requirements

## Success Criteria

**🎉 Deployment Complete** when all tests pass and the application is:
1. Accessible via deployed URLs
2. Database fully populated with CMBA data
3. Authentication system working
4. AI features enabled with DeepSeek
5. Frontend and backend communicating properly
6. Custom domain working (if configured)
7. Ready for end-user access and testing