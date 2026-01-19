# Supabase Integration Setup Guide

This document describes how to configure and use Supabase with the Workforce Tracker application.

## Prerequisites

1. A Supabase account (https://supabase.com)
2. A Supabase project created

## Setup Steps

### 1. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in your Supabase Dashboard:
- Go to **Settings** > **API**
- Copy the **Project URL** and **anon public** key

### 2. Run Database Migrations

Open your Supabase Dashboard and navigate to **SQL Editor**.

Copy the contents of `supabase/migrations/001_initial_schema.sql` and execute it.

This will create:
- All tables (profiles, uploads, employees, projects, assignments, etc.)
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic profile creation

### 3. Create Your First Admin User

After running the migrations, create an admin user:

1. Go to **Authentication** > **Users** in your Supabase Dashboard
2. Click **Add User** > **Create New User**
3. Enter email and password
4. After creation, run this SQL in the SQL Editor:

```sql
UPDATE profiles
SET role = 'admin', departments = ARRAY['ALL']
WHERE email = 'your-admin@email.com';
```

### 4. Configure Email Settings (Optional)

For production, configure SMTP settings in:
- **Authentication** > **Settings** > **SMTP Settings**

This enables proper email verification and password reset emails.

## Architecture Overview

### Database Schema

```
┌─────────────┐     ┌─────────────┐
│ auth.users  │────▶│  profiles   │
└─────────────┘     └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐
│   uploads   │◀────│  employees  │
└─────────────┘     └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐
│  projects   │◀────│ assignments │
└─────────────┘     └─────────────┘
```

### Row Level Security (RLS)

| Table | Admin Access | User Access |
|-------|--------------|-------------|
| profiles | Full CRUD | Read own profile |
| uploads | Full CRUD | Read own uploads |
| employees | Full CRUD | Read employees in assigned departments |
| projects | Full CRUD | Read only |
| assignments | Full CRUD | Read for accessible employees |

### Role-Based Access

**Admin Role:**
- Full access to all features
- Can view/delete uploads
- Can manage users
- Access to all departments

**User Role:**
- Read-only access
- Can only view employees in assigned departments
- Cannot import data or manage users

## File Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client configuration
├── services/
│   ├── supabaseAuth.js      # Authentication service
│   └── supabaseDB.js        # Database operations
├── contexts/
│   └── AuthContext.jsx      # Auth state management
└── components/
    ├── Login.jsx            # Login with Supabase Auth
    ├── UserManagement.jsx   # Admin user management
    └── UploadManagement.jsx # Admin upload management

supabase/
└── migrations/
    └── 001_initial_schema.sql  # Database schema
```

## Performance Optimizations

### Batch Inserts

Large uploads are processed in batches of 500 records:
- Reduces memory pressure
- Provides progress feedback
- Prevents timeout issues

Performance metrics are logged to console:
```
[Performance] Total bulk insert: 15234.21ms
[bulkAdd] Rate: 7245 records/second
```

### Instrumentation

The import system logs detailed performance metrics:
- Parse time (file reading)
- Validation time
- Transform time
- DB insert time
- Total duration
- Records per second

## Troubleshooting

### "Permission denied" errors

Check that:
1. RLS policies are correctly applied
2. User has appropriate role in profiles table
3. Session is valid (try logging out and back in)

### Slow imports

For large files (>50k records):
1. Consider using smaller batch sizes
2. Check network latency to Supabase
3. Review Supabase plan limits

### Profile not created after signup

The trigger should auto-create profiles. If missing:
```sql
-- Manually create profile
INSERT INTO profiles (id, username, email, role, departments)
VALUES (
  'user-uuid-here',
  'username',
  'email@example.com',
  'user',
  ARRAY[]::TEXT[]
);
```

## Fallback Mode

If Supabase is not configured (no `VITE_SUPABASE_URL`), the app falls back to IndexedDB for local storage. This is useful for:
- Development without Supabase
- Offline-capable deployments
- Demo/testing scenarios
