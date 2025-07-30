#!/bin/bash

echo "🛑 Stopping Phone Comparison Website..."

# Stop FastAPI application
if [ -f app.pid ]; then
    APP_PID=$(cat app.pid)
    if kill -0 $APP_PID 2>/dev/null; then
        echo "Stopping FastAPI application (PID: $APP_PID)..."
        kill $APP_PID
        rm -f app.pid
    else
        echo "FastAPI application not running"
        rm -f app.pid
    fi
else
    echo "No FastAPI PID file found"
fi

# Stop ngrok
if [ -f ngrok.pid ]; then
    NGROK_PID=$(cat ngrok.pid)
    if kill -0 $NGROK_PID 2>/dev/null; then
        echo "Stopping ngrok tunnel (PID: $NGROK_PID)..."
        kill $NGROK_PID
        rm -f ngrok.pid
    else
        echo "ngrok not running"
        rm -f ngrok.pid
    fi
else
    echo "No ngrok PID file found"
fi

# Alternative: Kill by process name
pkill -f "python3 -m app.main"
pkill -f "ngrok http"

echo "✅ All services stopped"