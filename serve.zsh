#!/bin/zsh
# Serve this checkout and open it in the default macOS browser.
set -eu

cd -- "${0:A:h}"
url='http://localhost:8000'

python3 -m http.server 8000 --bind 127.0.0.1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Wait for startup, and avoid opening another server if this one fails to bind.
for attempt in {1..50}; do
  sleep 0.1
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit 1
  fi
  if curl --silent --fail --output /dev/null "$url/"; then
    open "$url"
    print "Serving $url — press Ctrl+C to stop."
    wait "$server_pid"
    exit 0
  fi
done

print -u2 'The local server did not become ready within 5 seconds.'
exit 1
