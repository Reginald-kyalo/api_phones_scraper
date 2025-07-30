#!/bin/bash

echo "Starting Phone Comparison Website..."

# Check if we want to run in background mode
BACKGROUND_MODE=false
if [[ "$1" == "--background" || "$1" == "-b" ]]; then
    BACKGROUND_MODE=true
    echo "Running in background mode..."
fi

# Start MongoDB if not running
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    sudo systemctl start mongod
fi

# Start Redis if not running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis..."
    sudo systemctl start redis-server
fi

# Start the FastAPI application
echo "Starting FastAPI application on port 8000..."
if [ "$BACKGROUND_MODE" = true ]; then
    nohup python3 -m app.main > app.log 2>&1 &
else
    python3 -m app.main &
fi
APP_PID=$!

# Wait for app to start
echo "Waiting for application to start..."
sleep 5

# Start ngrok tunnel
echo "Starting ngrok tunnel..."
if [ "$BACKGROUND_MODE" = true ]; then
    nohup ngrok http 8000 > ngrok.log 2>&1 &
else
    ngrok http 8000 &
fi
NGROK_PID=$!

# Save PIDs for later management
echo $APP_PID > app.pid
echo $NGROK_PID > ngrok.pid

echo ""
echo "🚀 Application started successfully!"
echo "📱 App PID: $APP_PID"
echo "🌐 ngrok PID: $NGROK_PID"
echo ""

if [ "$BACKGROUND_MODE" = true ]; then
    echo "🔄 Running in background mode"
    echo "📊 Check ngrok dashboard at: http://127.0.0.1:4040"
    echo "📝 App logs: tail -f app.log"
    echo "📝 ngrok logs: tail -f ngrok.log"
    echo "🛑 To stop: ./stop_server.sh"
    echo ""
    echo "Getting ngrok URL..."
    sleep 3
    # Extract ngrok URL from logs
    if [ -f ngrok.log ]; then
        NGROK_URL=$(grep -o 'https://[a-z0-9-]*\.ngrok\.io' ngrok.log | head -1)
        if [ ! -z "$NGROK_URL" ]; then
            echo "🔗 Your website is live at: $NGROK_URL"
        else
            echo "⏳ ngrok URL will be available shortly. Check: tail -f ngrok.log"
        fi
    fi
    exit 0
else
    echo "📊 Check ngrok dashboard at: http://127.0.0.1:4040"
    echo "🔗 Your public URL will be displayed in the ngrok output above"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Cleanup function
    cleanup() {
        echo ""
        echo "🛑 Shutting down services..."
        kill $APP_PID 2>/dev/null
        kill $NGROK_PID 2>/dev/null
        rm -f app.pid ngrok.pid
        echo "✅ Services stopped"
        exit 0
    }

    trap cleanup SIGINT SIGTERM

    # Wait for user interruption
    wait
fi