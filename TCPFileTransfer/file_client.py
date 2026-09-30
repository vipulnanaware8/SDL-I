# TCP File Client
# Sends a filename to the server and prints the contents it receives.
# Run: python file_client.py   (start file_server.py first)

import socket

HOST = "localhost"
PORT = 5000


def main():
    filename = input("Enter filename: ")

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
            client.connect((HOST, PORT))
            client.sendall(filename.encode())

            # Read the whole reply until the server closes the connection
            data = b""
            while True:
                chunk = client.recv(4096)
                if not chunk:
                    break
                data += chunk
    except ConnectionRefusedError:
        print("Could not connect to server. Is file_server.py running?")
        return

    reply = data.decode(errors="replace")
    status, _, contents = reply.partition("\n")
    if status == "OK":
        print(f"----- Contents of {filename} -----")
        print(contents, end="")
        print("----- End of file -----")
    else:
        print(status)


if __name__ == "__main__":
    main()
