# Sports Management API Documentation

This directory contains comprehensive API documentation for the Sports Management backend system.

## 📁 Contents

### Core Documentation Files

- **[API.md](./API.md)** - Complete API documentation with examples, authentication, and usage guides
- **[api-spec.yaml](./api-spec.yaml)** - OpenAPI 3.0 specification for the entire API
- **[postman-collection.json](./postman-collection.json)** - Postman collection with all endpoints and examples
- **[api/index.html](./api/index.html)** - Interactive web-based documentation

## 🚀 Quick Start

### 1. View Documentation Online
Open the interactive documentation:
```bash
# Navigate to the docs directory
cd backend/docs

# Serve the HTML documentation (Python 3)
python3 -m http.server 8080

# Open in browser
open http://localhost:8080/api/index.html
```

### 2. Import into API Tools

#### Swagger UI / Redoc
```bash
# Using npx (requires Node.js)
npx swagger-ui-serve api-spec.yaml
# or
npx redoc-cli serve api-spec.yaml
```

#### Postman
1. Open Postman
2. Click "Import" → "Upload Files"
3. Select `postman-collection.json`
4. Set up environment variables:
   - `baseUrl`: `http://localhost:3001/api`
   - `authToken`: Your JWT token from login

#### Insomnia
1. Open Insomnia
2. Click "Import/Export" → "Import Data"
3. Select `api-spec.yaml`

## 📋 Documentation Sections

### Authentication & Security
- JWT token-based authentication
- Role-based access control (Admin, Manager, Referee)
- Rate limiting and security best practices
- Comprehensive error handling

### API Endpoints
- **Health Check** - System health monitoring
- **Authentication** - Login, registration, user management
- **Users & Referees** - User profile and referee management
- **Leagues & Teams** - Sports organization structure
- **Games** - Game scheduling and management
- **Assignments** - Referee assignment operations
- **AI Suggestions** - AI-powered assignment recommendations
- **Budgets** - Financial management and tracking

### Features Documented
- ✅ Complete CRUD operations for all entities
- ✅ Advanced filtering and pagination
- ✅ Bulk operations for assignments
- ✅ Conflict detection and validation
- ✅ AI-powered suggestions with customizable factors
- ✅ Comprehensive error responses
- ✅ Rate limiting specifications
- ✅ Authentication flows

## 🛠 For Developers

### Using the OpenAPI Specification
The `api-spec.yaml` file is a complete OpenAPI 3.0 specification that includes:
- All endpoint definitions
- Request/response schemas
- Authentication requirements
- Parameter validation rules
- Error response formats
- Example requests and responses

### Using the Postman Collection
The Postman collection includes:
- Pre-configured requests for all endpoints
- Environment variables for easy setup
- Test scripts for automated validation
- Example payloads and responses
- Authentication flow automation

### Testing the API
The documentation includes comprehensive examples for:
- Authentication flows
- CRUD operations
- Complex assignment scenarios
- AI suggestion generation
- Error handling patterns

## 📊 API Coverage

| Category | Endpoints | Coverage |
|----------|-----------|----------|
| Health Check | 1 | ✅ Complete |
| Authentication | 3 | ✅ Complete |
| Users | 2 | ✅ Complete |
| Referees | 2 | ✅ Complete |
| Leagues | 5 | ✅ Complete |
| Teams | 5 | ✅ Complete |
| Games | 5 | ✅ Complete |
| Assignments | 10 | ✅ Complete |
| AI Suggestions | 1 | ✅ Complete |
| Budgets | 5 | ✅ Complete |
| **Total** | **39** | **✅ 100%** |

## 🔧 Validation Status

- ✅ OpenAPI specification validates against OpenAPI 3.0 schema
- ✅ Postman collection JSON is well-formed
- ✅ All endpoints documented with examples
- ✅ Authentication flows tested
- ✅ Error responses documented
- ✅ Rate limiting specified
- ✅ Request/response schemas defined

## 🌐 Environment Configuration

### Development
```
baseUrl: http://localhost:3001/api
```

### Production
```
baseUrl: https://api.sportsmanagement.app
```

### Required Environment Variables for Testing
- `authToken` - JWT token from authentication
- `userId` - Current user ID
- `gameId` - Sample game ID
- `refereeId` - Sample referee ID
- `teamId` - Sample team ID
- `leagueId` - Sample league ID
- `assignmentId` - Sample assignment ID
- `budgetId` - Sample budget ID

## 📖 Usage Guide

1. **Start with Authentication** - Use the login endpoint to get a JWT token
2. **Set Environment Variables** - Configure your API client with the base URL and token
3. **Explore Endpoints** - Use the interactive documentation to understand the API
4. **Test with Postman** - Import the collection for hands-on testing
5. **Implement Client** - Use the OpenAPI spec to generate client SDKs

## 🤝 Contributing

When updating the API:
1. Update the route files in `backend/src/routes/`
2. Regenerate this documentation
3. Update the OpenAPI specification
4. Add new endpoints to the Postman collection
5. Test all endpoints for accuracy

## 📞 Support

For API support and questions:
- Review the complete documentation in `API.md`
- Check the OpenAPI specification for detailed schemas
- Use the Postman collection for testing
- Refer to the interactive web documentation

---

**Last Updated:** August 2024  
**API Version:** 1.0.0  
**Documentation Status:** Complete ✅