#!/bin/bash
# Quick Development Startup Script for Mac/Linux

echo "========================================"
echo "Sports Manager - Development Startup"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "[WARNING] Docker is not running!"
    echo ""
    echo "Please start Docker Desktop, then run this script again."
    echo ""
    echo "Alternatively, you can:"
    echo "  1. Start Cerbos manually: npm run start:cerbos"
    echo "  2. Or skip Cerbos: export SKIP_CERBOS=true"
    echo ""

    read -p "Continue without Cerbos? (y/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 1
    fi

    echo ""
    echo "Starting backend and frontend only..."

    # Start backend in new terminal
    if command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal -- bash -c "cd backend && npm run dev; exec bash"
    elif command -v xterm >/dev/null 2>&1; then
        xterm -e "cd backend && npm run dev" &
    else
        echo "Starting backend in background..."
        (cd backend && npm run dev) &
    fi

    sleep 3

    # Start frontend in new terminal
    if command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash"
    elif command -v xterm >/dev/null 2>&1; then
        xterm -e "cd frontend && npm run dev" &
    else
        echo "Starting frontend in background..."
        (cd frontend && npm run dev) &
    fi

else
    echo "[OK] Docker is running"
    echo ""

    # Check if concurrently is installed
    if [ ! -d "node_modules/concurrently" ]; then
        echo "Installing dependencies..."
        npm install
        echo ""
    fi

    echo "Starting all services..."
    npm run dev
fi

echo ""
echo "========================================"
echo "Services should be starting:"
echo "  - Cerbos:    http://localhost:3592"
echo "  - Backend:   http://localhost:3001"
echo "  - Frontend:  http://localhost:3000"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""
