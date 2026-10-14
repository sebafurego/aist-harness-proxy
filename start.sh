#!/bin/sh
# Starts the proxy and the Harness web UI together.
cd "$(dirname "$0")"
node server.js &
PROXY=$!
trap 'kill $PROXY' EXIT
AIST_PROXY_KEY=local npx @deepseek-ai/dsh web
