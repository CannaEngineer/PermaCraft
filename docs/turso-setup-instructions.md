# Turso Database Setup Instructions

This document contains the commands to set up your Turso database for PermaCraft.

## Step 1: Install Turso CLI

Install the Turso CLI on your system:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

## Step 2: Authenticate with Turso

Login to your Turso account:

```bash
turso auth login
```

## Step 3: Create Database

Create a new database called "permacraft":

```bash
turso db create permacraft
```

## Step 4: Get Database Credentials

Get the database URL:

```bash
turso db show permacraft --url
```

Create an authentication token:

```bash
turso db tokens create permacraft
```

## Step 5: Update Environment Variables

Add the credentials to your `.env.local` file:

```env
TURSO_DATABASE_URL=libsql://... (from step 4)
TURSO_AUTH_TOKEN=eyJ... (from step 4)
```

## Step 6: Apply Database Schema

Once you have the credentials configured, apply the database schema:

```bash
turso db shell permacraft < lib/db/schema.sql
```

## Verification

Verify the schema was created successfully:

```bash
turso db shell permacraft
```

Then run:

```sql
.tables
```

You should see tables like: users, sessions, farms, zones, species, plantings, etc.

Type `.exit` to exit the shell.
