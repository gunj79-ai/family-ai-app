#!/usr/bin/env bash
#
# FamilyAI Development Startup Script
# Starts backend and frontend servers with automatic dependency checking
#
# Usage: ./start-dev.sh [--force] [--backend-only] [--frontend-only]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
FORCE=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
NO_INSTALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --force) FORCE=true; shift ;;
    --backend-only) BACKEND_ONLY=true; shift ;;
    --frontend-only) FRONTEND_ONLY=true; shift ;;
    --no-install) NO_INSTALL=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Helper functions
ok() { echo -e "${GREEN}✓ $*${NC}"; }
err() { echo -e "${RED}✗ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
info() { echo -e "${CYAN}$*${NC}"; }

# ============================================================================
# STEP 1: Welcome
# ============================================================================

info "
╔════════════════════════════════════════╗
║  FamilyAI Development Startup Script   ║
╚════════════════════════════════════════╝
"

# ============================================================================
# STEP 2: Check Prerequisites
# ============================================================================

info "\n📋 Checking Prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
  err "Node.js not installed. Please install Node.js 20+ from nodejs.org"
  exit 1
fi
ok "Node.js: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
  err "npm not found"
  exit 1
fi
ok "npm: $(npm --version)"

# Check .env
if [ ! -f ".env" ]; then
  warn ".env file not found at project root"
  warn "You need to set ANTHROPIC_API_KEY in .env for streaming to work"
fi

# ============================================================================
# STEP 3: Kill Stuck Processes
# ============================================================================

info "\n🛑 Cleaning up stuck processes..."

STUCK=$(pgrep -f "node|npm" || true)
if [ -n "$STUCK" ]; then
  warn "Found stuck Node processes: $STUCK"
  kill -9 $STUCK 2>/dev/null || true
  ok "✓ Killed stuck processes"
  sleep 1
else
  ok "✓ No stuck processes"
fi

# ============================================================================
# STEP 4: Check Ports
# ============================================================================

info "\n🔌 Checking ports..."

PORT_3001=false
PORT_5173=false

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  PORT_3001=true
  warn "⚠ Port 3001 is busy (backend port)"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
  PORT_5173=true
  warn "⚠ Port 5173 is busy (frontend port)"
fi

if [ "$PORT_3001" = false ] && [ "$PORT_5173" = false ]; then
  ok "✓ Ports 3001 and 5173 are available"
fi

# ============================================================================
# STEP 5: Install Dependencies
# ============================================================================

if [ "$NO_INSTALL" = false ] && [ "$FORCE" = false ]; then
  info "\n📦 Checking dependencies..."
  
  if [ ! -d "backend/node_modules" ]; then
    info "  Installing backend dependencies..."
    (cd backend && npm install --legacy-peer-deps >/dev/null 2>&1)
    ok "  ✓ Backend dependencies installed"
  fi
  
  if [ ! -d "frontend/node_modules" ]; then
    info "  Installing frontend dependencies..."
    (cd frontend && npm install >/dev/null 2>&1)
    ok "  ✓ Frontend dependencies installed"
  fi
fi

# ============================================================================
# STEP 6: Start Services
# ============================================================================

info "\n🚀 Starting services..."

# Cleanup on exit
cleanup() {
  info "\n🛑 Stopping services..."
  kill %1 2>/dev/null || true
  kill %2 2>/dev/null || true
  pkill -f "node|npm" || true
  ok "✓ All services stopped. Goodbye!"
}

trap cleanup EXIT

# Start Backend
if [ "$FRONTEND_ONLY" = false ]; then
  info "  ⏳ Starting Backend (port 3001)..."
  (cd backend && npx tsx src/index.ts) &
  BACKEND_PID=$!
  ok "  ✓ Backend started (PID: $BACKEND_PID)"
  
  # Wait for backend to be ready (max 10 seconds)
  for i in {1..10}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
      ok "  ✓ Backend is responding (http://localhost:3001)"
      break
    fi
    sleep 1
  done
fi

# Start Frontend
if [ "$BACKEND_ONLY" = false ]; then
  info "  ⏳ Starting Frontend (port 5173)..."
  (cd frontend && npm run dev) &
  FRONTEND_PID=$!
  ok "  ✓ Frontend started (PID: $FRONTEND_PID)"
  info "  ⏳ Waiting for dev server to start (usually 5-10 seconds)..."
  
  # Wait for frontend to be ready (max 30 seconds)
  for i in {1..30}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
      ok "  ✓ Frontend is responding (http://localhost:5173)"
      break
    fi
    sleep 1
  done
fi

# ============================================================================
# STEP 7: Show Status and Instructions
# ============================================================================

ok "
╔════════════════════════════════════════════════════════════╗
║                      ✓ Ready to Develop                    ║
╚════════════════════════════════════════════════════════════╝
"

info "📍 Service URLs:"
ok "   Frontend (UI):     http://localhost:5173"
ok "   Backend (API):     http://localhost:3001"
ok "   Health Check:      http://localhost:3001/api/health"

info "\n📝 Login Credentials (default):"
ok "   Username: admin"
ok "   Password: admin123"

info "\n⌨️  Keyboard Shortcuts:"
ok "   Ctrl+C to stop all services"

info "\n💡 Tips:"
ok "   • Frontend auto-reloads on file changes (HMR)"
ok "   • Backend requires restart for code changes"
ok "   • Open DevTools (F12) to debug"
ok "   • Check STARTUP_GUIDE.md for troubleshooting"

warn "\n⏳ Servers running... Press Ctrl+C to stop all services.\n"

# Wait for all background jobs
wait
