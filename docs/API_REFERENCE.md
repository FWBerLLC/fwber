# API Reference

The fwber API documentation is automatically generated from the codebase using OpenAPI (Swagger) annotations.

## Accessing the Documentation

### Local Development
When running the backend locally, you can access the interactive Swagger UI at:
`http://localhost:8000/api/docs`

### Production
In production, the documentation is available at:
`https://api.fwber.site/api/docs`

## Generating the Documentation

To regenerate the `api-docs.json` file after making changes to Controllers or Schemas, run:

```bash
cd fwber-backend
php artisan l5-swagger:generate
```

## Key Schemas

The API uses standard JSON resources. Key schemas include:

- **User**: Basic user information.
- **UserProfileResource**: Detailed profile data including preferences and photos.
- **Photo**: Image assets with privacy settings.
- **Match**: Match metadata and status.
- **DirectMessage**: Chat messages.
- **ProximityArtifact**: Location-based content.

## Authentication

All API endpoints (except login/register) require a Bearer Token.
Header: `Authorization: Bearer <token>`

## Rate Limiting

The API implements rate limiting. Check the `X-RateLimit-*` headers in the response.
- `X-RateLimit-Limit`: Total requests allowed.
- `X-RateLimit-Remaining`: Requests remaining.
