# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

fwber.site is a dating/matching application undergoing modernization from legacy PHP (2011) to a modern stack. The project has three layers:

1. **Legacy PHP Application** (root directory) - Secure, modernized PHP 8+ with object-oriented architecture
2. **Laravel Backend** (`fwber-backend/`) - Modern Laravel 12 API in progress
3. **Next.js Frontend** (`fwber-frontend/`) - React/TypeScript frontend in progress

The legacy PHP layer is fully functional and secure, serving as the foundation while the Laravel/Next.js migration is underway.

## Development Setup

### Legacy PHP Application

```cmd
# Install PHP dependencies
composer install

# Create environment file
copy .env.example .env
notepad .env

# Set up database (phpMyAdmin or MySQL CLI)
# 1. Create user 'fwber' with password 'Temppass0!'
# 2. Create database 'fwber' and grant all privileges
# 3. Import setup-database.sql

# Start local server
php -S 127.0.0.1:8000

# For debug mode, set DEBUG_MODE=true in .env
```

### Laravel Backend

```cmd
cd fwber-backend

# Install dependencies
composer install

# Set up environment
copy .env.example .env
php artisan key:generate

# Run migrations
php artisan migrate

# Start development server
php artisan serve

# Run tests
composer test
# or: php artisan test

# Run queue worker
php artisan queue:listen --tries=1

# View logs
php artisan pail --timeout=0

# Lint/format code
composer run dev
```

### Next.js Frontend

```cmd
cd fwber-frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Lint
npm run lint
```

## Architecture

### Legacy PHP Core (`/`)

**Bootstrap Flow:**
1. `_init.php` - Central bootstrap (Composer autoloader, .env loading, database, session config)
2. `_db.php` - Single PDO database connection
3. Manager classes initialize (SecurityManager, ProfileManager, PhotoManager)

**Manager Classes:**
- `SecurityManager` - Argon2ID password hashing, session management, CSRF tokens, rate limiting
- `ProfileManager` - Handles `users` and `user_preferences` tables, extensible preference system
- `PhotoManager` - Secure photo uploads with MIME validation, file management
- `MatchingEngine` - Legacy matching algorithm
- `EnhancedMatchingEngine` - Improved matching with better scoring
- `AIMatchingEngine` - Placeholder for ML-based matching

**Security Features:**
- CSRF protection on all forms (single-use tokens)
- Rate limiting on authentication endpoints
- Argon2ID password hashing
- Database-backed secure sessions
- PDO prepared statements (SQL injection prevention)

### API Layer (`/api/`)

RESTful endpoints using manager classes:
- `upload-photo.php` / `delete-photo.php` - Photo management
- `match-action.php` - Like/pass/block actions
- `get-enhanced-matches.php` / `get-ai-matches.php` - Matching algorithms
- `update-location.php` - Geolocation updates
- `generate-avatar.php` - AI avatar generation

### Laravel Backend (`fwber-backend/`)

Modern Laravel 12 application structure:
- PSR-4 autoloading: `App\` namespace maps to `app/`
- Standard Laravel directory structure (app/, config/, database/, routes/, tests/)
- Uses Laravel's built-in features: Eloquent ORM, migrations, authentication, queues

### Next.js Frontend (`fwber-frontend/`)

- Next.js 14 with App Router
- TypeScript with strict type checking
- Tailwind CSS for styling
- Zustand for state management
- React Hook Form + Zod for form validation
- NextAuth for authentication
- Radix UI components

## Database Migrations

### Legacy Matcher Compatibility

When updating the profile form, ensure backward compatibility:

```cmd
# Enable debug mode first
notepad .env  # Set DEBUG_MODE=true

# Start server
php -S 127.0.0.1:8000

# Apply migration (login required)
# Visit: http://127.0.0.1:8000/scripts/apply_migration_web.php

# Verify schema
# Visit: http://127.0.0.1:8000/scripts/profile_diagnostics.php

# CLI alternative:
php scripts\apply_migration.php
# or
mysql -h localhost -u fwber -p fwber < db\migrations\2025-10-11-legacy-matcher-compat.sql

# Disable debug when done
notepad .env  # Set DEBUG_MODE=false
```

## Code Organization

### Key Files to Know

**Legacy PHP:**
- `_init.php` - Bootstrap (include in every page)
- `_db.php` - Database connection
- `security-manager.php` - Security operations
- `ProfileManager.php` - User profile management
- `PhotoManager.php` - Photo management
- `_globals.php` - Global functions and utilities

**Modernized Pages:**
- `index.php`, `signin.php`, `signout.php`, `forgot-password.php`
- `settings.php`, `profile.php`, `edit-profile.php`
- `matches.php`, `manage-pics.php`, `contact.php`

**Critical Feature:**
- `profile-form.php` - Needs completion with all preference fields from original design

### Configuration

**Environment Variables (.env):**
```
DB_HOST, DB_NAME, DB_USER, DB_PASS
GEMINI_API_KEY, REPLICATE_API_TOKEN, OPENAI_API_KEY
ENCRYPTION_KEY, JWT_SECRET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
DEBUG_MODE, LOG_LEVEL
```

**Database Tables:**
- `users` - Core profile data (includes legacy columns for matcher compatibility)
- `user_preferences` - Extended preferences (automatically handled by ProfileManager)
- `user_sessions` - Secure session storage
- `user_photos` - Photo metadata
- `user_actions` - Rate limiting and audit log

## Development Workflow

### Working with Legacy PHP

1. Always include `_init.php` first
2. Use manager classes instead of direct database queries
3. CSRF tokens required on all POST forms: `$securityManager->generateCsrfToken()`
4. Validate sessions: `validateSessionOrCookiesReturnLoggedIn()`
5. Use PDO prepared statements for any custom queries

### Working with Laravel

1. Follow PSR-4 autoloading conventions
2. Create migrations for schema changes: `php artisan make:migration`
3. Use Eloquent models for database operations
4. API routes in `routes/api.php`, web routes in `routes/web.php`
5. Tests in `tests/Feature/` and `tests/Unit/`

### Working with Next.js

1. App Router: pages in `app/` directory
2. Server components by default, add `'use client'` for client components
3. API routes in `app/api/`
4. Shared components in `components/`
5. Type definitions in `types/`

## Testing

### Legacy PHP
```cmd
# Manual testing via browser
php -S 127.0.0.1:8000

# Database test users
php db\generate-test-users.php
php db\verify-test-data.php

# Profile diagnostics
# Visit: http://127.0.0.1:8000/scripts/profile_diagnostics.php
```

### Laravel Backend
```cmd
cd fwber-backend
composer test
php artisan test --filter=UserTest
```

### Next.js Frontend
```cmd
cd fwber-frontend
npm run type-check
npm run lint
npm run build  # Catches build-time errors
```

## Security Considerations

1. **Never hardcode credentials** - Use .env files (excluded from git)
2. **CSRF tokens required** - All forms must include and validate tokens
3. **Rate limiting active** - Authentication endpoints are protected
4. **Sessions are database-backed** - Token validation happens server-side
5. **Password hashing** - Argon2ID with proper cost parameters
6. **File uploads** - MIME type validation, secure storage, ownership verification
7. **SQL injection prevention** - PDO prepared statements only

## Migration Path

The project is transitioning from legacy PHP to Laravel/Next.js:

1. **Phase 1 (Complete):** Security hardening of legacy PHP
2. **Phase 2 (In Progress):** Laravel backend API development
3. **Phase 3 (In Progress):** Next.js frontend development
4. **Phase 4 (Planned):** Gradual feature migration from legacy to modern stack
5. **Phase 5 (Future):** Deprecate legacy PHP once feature parity achieved

Both stacks will coexist during the transition. The legacy PHP application remains the source of truth for authentication and core features.

## AI/ML Features

The application has placeholder infrastructure for AI-powered features:

- `ai-matching-engine.php` - Stub for ML-based matching
- `avatar-generator.php` - AI avatar generation via Replicate/OpenAI/Gemini
- `EnhancedMatchingEngine` - Improved scoring algorithm ready for ML enhancement

## Project History Note

This codebase was collaboratively modernized by human developers with AI assistance (Gemini, Claude). The README.md and this WARP.md serve as canonical documentation superseding conversational development logs.
