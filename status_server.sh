#!/bin/bash

echo "📊 Phone Comparison Website Status"
echo "=================================="

# Check FastAPI
if [ -f app.pid ]; then
    APP_PID=$(cat app.pid)
    if kill -0 $APP_PID 2>/dev/null; then
        echo "✅ FastAPI: Running (PID: $APP_PID)"
    else
        echo "❌ FastAPI: Not running (stale PID file)"
        rm -f app.pid
    fi
else
    echo "❌ FastAPI: Not running"
fi

# Check ngrok
if [ -f ngrok.pid ]; then
    NGROK_PID=$(cat ngrok.pid)
    if kill -0 $NGROK_PID 2>/dev/null; then
        echo "✅ ngrok: Running (PID: $NGROK_PID)"
        
        # Try to get ngrok URL
        if command -v curl &> /dev/null; then
            NGROK_URL=$(curl -s localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 | head -1)
            if [ ! -z "$NGROK_URL" ]; then
                echo "🔗 URL: $NGROK_URL"
            fi
        fi
    else
        echo "❌ ngrok: Not running (stale PID file)"
        rm -f ngrok.pid
    fi
else
    echo "❌ ngrok: Not running"
fi

# Check MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB: Running"
else
    echo "❌ MongoDB: Not running"
fi

# Check Redis
if pgrep -x "redis-server" > /dev/null; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not running"
fi

echo ""
echo "📝 Logs:"
echo "  App logs: tail -f app.log"
echo "  ngrok logs: tail -f ngrok.log"
echo "  Dashboard: http://127.0.0.1:4040"