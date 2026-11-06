#!/usr/bin/env bash
# Starts the bot then tails the live log so all output appears in the console.

LIVE_LOG="adams/logs/live.log"

# Clear the live log from previous runs
mkdir -p adams/logs
> "$LIVE_LOG"

echo "[$(date '+%H:%M:%S')] Starting BWM-XMD..."

# Start the bot in background
node index.js &
BOT_PID=$!

# Give it a moment to boot then start tailing
sleep 2
tail -f "$LIVE_LOG" &
TAIL_PID=$!

# Wait for the bot; when it exits, stop the tail too
wait $BOT_PID
kill $TAIL_PID 2>/dev/null
echo "[$(date '+%H:%M:%S')] Bot process exited."
