# ChainCheck API Documentation

## Swagger/OpenAPI Interactive Documentation

ChainCheck provides comprehensive API documentation using Swagger/OpenAPI 3.0 specification.

### Accessing the Documentation

Once the backend server is running, you can access the interactive API documentation at:

**Swagger UI**: `http://localhost:4000/api-docs`

**OpenAPI JSON Spec**: `http://localhost:4000/api-docs.json`

### Features

- **Interactive API Explorer**: Test API endpoints directly from the browser
- **Request/Response Examples**: See example requests and responses for each endpoint
- **Authentication Support**: Test authenticated endpoints with JWT tokens
- **Schema Definitions**: View detailed data models and schemas
- **Try It Out**: Execute API calls directly from the documentation

### Authentication

Most endpoints require authentication using JWT tokens. To authenticate in Swagger UI:

1. First, call `/api/auth/login` to get a JWT token
2. Click the "Authorize" button at the top of the Swagger UI
3. Enter your token in the format: `Bearer <your-token>`
4. Click "Authorize" to authenticate all requests

### API Endpoints Documented

#### Authentication
- `POST /api/auth/login` - Driver login
- `POST /api/auth/logout` - Driver logout

#### Deliveries
- `GET /api/deliveries` - List deliveries
- `GET /api/deliveries/{id}` - Get delivery by ID
- `GET /api/deliveries/by-proof/{proofHash}` - Get delivery by proof hash
- `POST /api/deliveries/{id}/verify` - Verify a delivery
- `POST /api/deliveries/{id}/photo` - Upload delivery photo
- `POST /api/deliveries/{id}/signature` - Upload delivery signature
- `GET /api/proofs/{proofHash}/accuracy` - Get location accuracy metrics
- `GET /api/proofs/{proofHash}/chain` - Get bound witness chain
- `GET /api/proofs/{proofHash}/crypto` - Get cryptographic details

#### Analytics
- `GET /api/analytics/roi` - Get ROI metrics

#### Network
- `GET /api/network/statistics` - Get network-wide statistics
- `GET /api/network/nodes` - Get witness nodes
- `GET /api/network/nodes/{nodeAddress}` - Get witness node by address

#### Server Status
- `GET /api/server-status` - Get status of all services
- `GET /api/server-status/{service}` - Get status of a specific service

### Using the API

#### Example: Authenticate and Verify a Delivery

```bash
# 1. Login to get a token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"driverId": "driver123", "password": "password123"}'

# Response:
# {
#   "success": true,
#   "driverId": "driver123",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expiresIn": "7d"
# }

# 2. Use the token to verify a delivery
curl -X POST http://localhost:4000/api/deliveries/{id}/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timestamp": 1703123456789
  }'
```

#### Example: Get ROI Metrics

```bash
curl -X GET "http://localhost:4000/api/analytics/roi?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z" \
  -H "Authorization: Bearer <token>"
```

### Rate Limiting

The API implements rate limiting to prevent abuse:

- **Auth endpoints**: More lenient limits (doesn't count successful logins)
- **Configuration endpoints**: Higher limits for polling
- **General API endpoints**: Standard rate limits

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in the window
- `X-RateLimit-Reset`: Time when the rate limit resets

### Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `413` - Payload Too Large (file size limits)
- `500` - Internal Server Error
- `503` - Service Unavailable (blockchain service down)

### File Upload Limits

- **Photo uploads**: Maximum 25MB
- **Signature uploads**: Maximum 25MB
- Supported formats: PNG, JPG, JPEG

### Integration Examples

See the Swagger UI for complete request/response examples and try out endpoints directly.

For programmatic integration, use the OpenAPI JSON spec at `/api-docs.json` to generate client SDKs using tools like:
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)
- [Postman](https://www.postman.com/) (can import OpenAPI spec)

### Support

For API support or questions, contact: support@chaincheck.io

