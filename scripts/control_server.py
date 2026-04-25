#!/usr/bin/env python3
"""
Control API for the finance-app VPS. Listens on :9999 inside the docker
network; Caddy proxies /__* paths to it. HMAC-SHA256 on every request.

Endpoints:
  GET  /__ping              — liveness (no auth)
  GET  /__ps                — docker compose ps --format json
  GET  /__logs/<service>    — tail logs (app|caddy|control), ?tail=N (max 2000)
  POST /__deploy            — git pull --ff-only; docker compose build app; up -d --no-deps app
  POST /__restart?service=X — docker compose restart X
  POST /__exec?action=Y     — whitelisted one-shots: init-admin | migrate

Auth (all except /__ping):
  X-Timestamp: unix seconds (±300s skew allowed)
  X-Signature: hex hmac-sha256(secret, f"{METHOD}\\n{PATH}\\n{TS}\\n{sha256(body)}")
"""
import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

SECRET = os.environ.get("CONTROL_SECRET", "").encode()
if not SECRET:
    print("FATAL: CONTROL_SECRET env var required", file=sys.stderr)
    sys.exit(1)

REPO_DIR = os.environ.get("REPO_DIR", "/opt/finance")
COMPOSE_FILE = f"{REPO_DIR}/docker-compose.yml"
ENV_FILE = f"{REPO_DIR}/.env.production"
COMPOSE = ["docker", "compose", "-f", COMPOSE_FILE, "--env-file", ENV_FILE]
MAX_SKEW = 300
KNOWN_SERVICES = {"app", "caddy", "control"}


def verify(headers, method: str, path: str, body: bytes) -> bool:
    ts = headers.get("X-Timestamp", "")
    sig = headers.get("X-Signature", "")
    if not ts.isdigit() or not sig:
        return False
    if abs(int(ts) - int(time.time())) > MAX_SKEW:
        return False
    body_hash = hashlib.sha256(body).hexdigest()
    msg = f"{method}\n{path}\n{ts}\n{body_hash}".encode()
    expect = hmac.new(SECRET, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expect, sig)


def run(cmd, timeout=900):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "cmd": cmd,
            "code": p.returncode,
            "stdout": p.stdout[-16000:],
            "stderr": p.stderr[-16000:],
        }
    except subprocess.TimeoutExpired:
        return {"cmd": cmd, "code": -1, "stderr": f"timeout after {timeout}s"}
    except Exception as e:
        return {"cmd": cmd, "code": -2, "stderr": f"{type(e).__name__}: {e}"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write(
            f"{self.address_string()} {self.command} {self.path} -> {fmt % args}\n"
        )

    def _send(self, code, payload, ctype="application/json"):
        if isinstance(payload, (dict, list)):
            data = json.dumps(payload, ensure_ascii=False, indent=2).encode()
        elif isinstance(payload, bytes):
            data = payload
        else:
            data = str(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _body(self) -> bytes:
        n = int(self.headers.get("Content-Length", "0"))
        return self.rfile.read(n) if n > 0 else b""

    def _dispatch(self, method: str):
        url = urlparse(self.path)
        path = url.path
        qs = parse_qs(url.query)
        body = self._body() if method == "POST" else b""

        if path == "/__ping":
            return self._send(200, {"ok": True, "ts": int(time.time())})

        if not verify(self.headers, method, path, body):
            return self._send(401, {"error": "bad signature or timestamp skew"})

        if method == "GET" and path == "/__ps":
            return self._send(200, run(COMPOSE + ["ps", "--format", "json"]))

        if method == "GET" and path.startswith("/__logs/"):
            svc = path.removeprefix("/__logs/")
            if svc not in KNOWN_SERVICES:
                return self._send(400, {"error": f"unknown service: {svc}"})
            try:
                tail = min(int(qs.get("tail", ["200"])[0]), 2000)
            except ValueError:
                tail = 200
            return self._send(
                200,
                run(COMPOSE + ["logs", svc, "--tail", str(tail), "--no-color"]),
            )

        if method == "POST" and path == "/__deploy":
            steps = {}
            steps["git_fetch"] = run(
                ["git", "-C", REPO_DIR, "fetch", "origin", "--depth=1"]
            )
            if steps["git_fetch"]["code"] != 0:
                return self._send(500, steps)
            branch = (
                run(["git", "-C", REPO_DIR, "rev-parse", "--abbrev-ref", "HEAD"])
                .get("stdout", "")
                .strip()
            )
            steps["git_reset"] = run(
                ["git", "-C", REPO_DIR, "reset", "--hard", f"origin/{branch}"]
            )
            if steps["git_reset"]["code"] != 0:
                return self._send(500, steps)
            steps["build"] = run(COMPOSE + ["build", "app"], timeout=1500)
            if steps["build"]["code"] != 0:
                return self._send(500, steps)
            steps["up"] = run(COMPOSE + ["up", "-d", "--no-deps", "app"])
            return self._send(200, steps)

        if method == "POST" and path == "/__restart":
            svc = qs.get("service", ["app"])[0]
            if svc not in KNOWN_SERVICES:
                return self._send(400, {"error": f"unknown service: {svc}"})
            return self._send(200, run(COMPOSE + ["restart", svc]))

        if method == "POST" and path == "/__exec":
            action = qs.get("action", [""])[0]
            if action == "init-admin":
                return self._send(
                    200,
                    run(
                        [
                            "docker",
                            "exec",
                            "finance-app",
                            "npx",
                            "tsx",
                            "scripts/init-admin.ts",
                        ]
                    ),
                )
            if action == "migrate":
                return self._send(
                    200,
                    run(
                        [
                            "docker",
                            "exec",
                            "finance-app",
                            "npx",
                            "drizzle-kit",
                            "migrate",
                            "--config=drizzle.config.ts",
                        ]
                    ),
                )
            return self._send(400, {"error": f"unknown action: {action}"})

        return self._send(404, {"error": "not found", "path": path})

    def do_GET(self):
        try:
            self._dispatch("GET")
        except Exception as e:
            self._send(500, {"error": f"{type(e).__name__}: {e}"})

    def do_POST(self):
        try:
            self._dispatch("POST")
        except Exception as e:
            self._send(500, {"error": f"{type(e).__name__}: {e}"})


def main():
    addr = ("0.0.0.0", 9999)
    srv = ThreadingHTTPServer(addr, Handler)
    print(f"[control] listening on {addr}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
