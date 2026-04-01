#!/usr/bin/env python3
"""Tiny local server for the Claude Code tool invocations dashboard."""

import http.server
import json
import os
import sys
import webbrowser
from pathlib import Path

PORT = 7391
LOG_FILE = Path.home() / ".claude" / "tool-invocations.jsonl"
DASHBOARD_DIR = Path(__file__).parent


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD_DIR), **kwargs)

    def do_GET(self):
        if self.path == "/api/invocations":
            self.send_invocations()
        else:
            super().do_GET()

    def send_invocations(self):
        try:
            content = LOG_FILE.read_text() if LOG_FILE.exists() else ""
            data = content.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            err = json.dumps({"error": str(e)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(err)))
            self.end_headers()
            self.wfile.write(err)

    def log_message(self, format, *args):
        pass  # suppress request logs


def main():
    server = http.server.HTTPServer(("127.0.0.1", PORT), DashboardHandler)
    url = f"http://127.0.0.1:{PORT}"
    print(f"Dashboard running at {url}")
    print("Press Ctrl+C to stop\n")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
