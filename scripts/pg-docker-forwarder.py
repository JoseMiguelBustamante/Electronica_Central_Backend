#!/usr/bin/env python3
"""Forward TCP 172.16.1.1:5432 -> 127.0.0.1:5432 so Dokploy containers can reach host Postgres.

Does not change the Postgres container or stop the running API/Vite processes.
Bind is only on the docker_gwbridge address (not the public interface).
"""
from __future__ import annotations

import argparse
import select
import socket
import sys
import threading


def pipe(src: socket.socket, dst: socket.socket) -> None:
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        try:
            dst.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def handle(client: socket.socket, target_host: str, target_port: int) -> None:
    upstream = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        upstream.connect((target_host, target_port))
    except OSError as exc:
        print(f"upstream connect failed: {exc}", file=sys.stderr)
        client.close()
        return
    t1 = threading.Thread(target=pipe, args=(client, upstream), daemon=True)
    t2 = threading.Thread(target=pipe, args=(upstream, client), daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    client.close()
    upstream.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--listen-host", default="172.16.1.1")
    parser.add_argument("--listen-port", type=int, default=5432)
    parser.add_argument("--target-host", default="127.0.0.1")
    parser.add_argument("--target-port", type=int, default=5432)
    args = parser.parse_args()

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((args.listen_host, args.listen_port))
    server.listen(64)
    print(
        f"forwarding {args.listen_host}:{args.listen_port} -> "
        f"{args.target_host}:{args.target_port}",
        flush=True,
    )
    while True:
        readable, _, _ = select.select([server], [], [], 1.0)
        if not readable:
            continue
        client, addr = server.accept()
        threading.Thread(
            target=handle,
            args=(client, args.target_host, args.target_port),
            daemon=True,
        ).start()


if __name__ == "__main__":
    raise SystemExit(main())
