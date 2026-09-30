# TCP File Server
# Waits for a client to send a filename, then sends back the file's
# contents if it exists, or an error message if it does not.
# Run: python file_server.py

import os
import socket
import threading

HOST = "0.0.0.0"
PORT = 5000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def handle_client(conn, addr):
    with conn:
        filename = conn.recv(1024).decode().strip()
        print(f"Requested file: {filename}")

        # Only allow files inside the server's folder
        path = os.path.abspath(os.path.join(BASE_DIR, filename))
        if not filename or not path.startswith(BASE_DIR + os.sep) or not os.path.isfile(path):
            conn.sendall(f"ERROR: File '{filename}' not found\n".encode())
            print(f"File not found: {filename}")
            return

        conn.sendall(b"OK\n")
        with open(path, "rb") as f:
            conn.sendall(f.read())
        print(f"File sent: {filename}")


def main():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind((HOST, PORT))
        server.listen()
        print(f"Server started on port {PORT}")
        print(f"Serving files from: {BASE_DIR}")

        while True:
            conn, addr = server.accept()
            print(f"Client connected: {addr[0]}")
            threading.Thread(target=handle_client, args=(conn, addr)).start()


if __name__ == "__main__":
    main()
