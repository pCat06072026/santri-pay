#!/usr/bin/env bash

# ============================================================
# Santri-Pay Deployment Script
# For local development and manual deployments
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prereq() {
    info "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi

    if ! command -v wrangler &> /dev/null; then
        warn "Wrangler not found. Installing..."
        npm install -g wrangler
    fi

    info "All prerequisites met!"
}

# Install dependencies
install_deps() {
    info "Installing dependencies..."
    npm ci
}

# Type check
type_check() {
    info "Running type check..."
    npx tsc --noEmit || {
        error "Type check failed!"
        exit 1
    }
    info "Type check passed!"
}

# Lint
lint() {
    info "Running linter..."
    npm run lint || {
        warn "Linting issues found (non-blocking)"
    }
}

# Build
build() {
    info "Building application..."
    npm run build
    info "Build successful!"
}

# Apply migrations to local D1
migrate_local() {
    info "Applying migrations to local D1..."
    wrangler d1 migrations apply santi-pay-dev --local
    info "Local migrations applied!"
}

# Apply migrations to production
migrate_prod() {
    info "Applying migrations to production D1..."
    read -p "Continue with production migration? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler d1 migrations apply santi-pay-prod --env production
        info "Production migrations applied!"
    else
        info "Migration cancelled"
    fi
}

# Deploy to preview
deploy_preview() {
    info "Deploying to preview..."
    wrangler deploy --env preview
    info "Preview deployed!"
}

# Deploy to production
deploy_prod() {
    info "Deploying to production..."
    read -p "Continue with production deployment? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler deploy --env production
        info "Production deployed!"
        info "URL: https://spp.p03789439.workers.dev"
    else
        info "Deployment cancelled"
    fi
}

# Development mode
dev() {
    info "Starting development server..."
    migrate_local
    npm run dev
}

# Full deployment flow
full_deploy() {
    info "Starting full deployment..."
    type_check
    lint
    build
    migrate_local
    deploy_preview
    info "Preview deployment complete!"
}

# Help
show_help() {
    echo "Santri-Pay Deployment Script"
    echo ""
    echo "Usage: ./scripts/deploy.sh <command>"
    echo ""
    echo "Commands:"
    echo "  install     Install dependencies"
    echo "  typecheck   Run TypeScript type check"
    echo "  lint        Run linter"
    echo "  build       Build application"
    echo "  migrate     Apply local migrations"
    echo "  migrate-prod  Apply production migrations"
    echo "  preview     Deploy to preview"
    echo "  prod        Deploy to production"
    echo "  dev         Start development mode"
    echo "  full        Full deployment flow"
    echo "  help        Show this help"
    echo ""
}

# Main
case "${1:-help}" in
    install)
        install_deps
        ;;
    typecheck)
        type_check
        ;;
    lint)
        lint
        ;;
    build)
        build
        ;;
    migrate)
        migrate_local
        ;;
    migrate-prod)
        migrate_prod
        ;;
    preview)
        deploy_preview
        ;;
    prod)
        deploy_prod
        ;;
    dev)
        dev
        ;;
    full)
        full_deploy
        ;;
    help|*)
        show_help
        ;;
esac
