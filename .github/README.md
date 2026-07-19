# GitHub Actions Setup Guide

## Prerequisites

Before enabling the CI/CD pipeline, you need to:

### 1. Create Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Select **Edit Cloudflare Workers** template
5. Set the following permissions:
   - **Account**: Edit Cloudflare Workers
   - **User**: None needed
   - **Zone**: None needed
6. Click **Create Token**
7. Copy the generated token (you won't see it again!)

### 2. Get Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your domain or worker
3. Copy the **Account ID** from the right sidebar

### 3. Create Production D1 Database

```bash
# Run this locally
wrangler d1 create santi-pay-prod
# Copy the database ID from the output
```

### 4. Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `CLOUDFLARE_PROD_DATABASE_ID` | Production D1 database ID |
| `CLOUDFLARE_PREVIEW_DATABASE_ID` | Preview D1 database ID (optional) |

## Workflow Triggers

### Automatic Deployments

| Event | Action |
|-------|--------|
| Push to `main` | Deploy to production |
| Pull Request | Deploy to preview URL |
| Manual trigger | See below |

### Manual Deployment

To trigger a manual deployment:

```bash
# Via GitHub CLI
gh workflow run deploy.yml --ref main
```

## Deployment URLs

| Environment | URL |
|------------|-----|
| Production | `https://spp.p03789439.workers.dev` |
| Preview | `https://preview.<hash>.workers.dev` (posted in PR) |

## Troubleshooting

### Migration Fails

If migrations fail during deployment:

1. Check the migration SQL syntax
2. Verify D1 database exists
3. Ensure API token has correct permissions

### Build Fails

Check the GitHub Actions logs:
1. Go to **Actions** tab
2. Click on the failed workflow
3. Expand the failed step to see logs

### Deployment Not Triggering

1. Verify workflow file is in `.github/workflows/`
2. Check branch protection rules
3. Ensure secrets are properly configured
