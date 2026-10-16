#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
pod_log="${RUNNER_TEMP:-/tmp}/storefront-pod-install.log"

cd "$project_root/ios"

for attempt in 1 2 3; do
    if pod install --repo-update 2>&1 | tee "$pod_log"; then
        exit 0
    fi

    if ! grep -Eqi 'SSL certificate problem|certificate verify failed|Failed to open TCP connection|Connection reset|timed out' "$pod_log"; then
        echo "CocoaPods failed with a non-network error; not retrying."
        exit 1
    fi

    if [ "$attempt" -eq 3 ]; then
        echo "CocoaPods failed after $attempt verified network attempts."
        exit 1
    fi

    echo "::warning::CocoaPods network attempt $attempt failed; retrying with TLS verification enabled."
    sleep $((attempt * 10))
done
