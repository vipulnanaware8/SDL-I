# TCP File Transfer (Client–Server)

The client sends a filename to the server. If the file exists, the server sends back its contents. If it doesn't, the server sends an error message.

## Run

Open two terminals in this folder.

**Terminal 1 – server**
```
javac FileServer.java
java FileServer
```

**Terminal 2 – client**
```
javac FileClient.java
java FileClient
Enter filename: sample.txt
```

Optional arguments: `java FileServer <port>` and `java FileClient <host> <port>` (default `localhost 5000`).

The server only serves files from the folder it was started in.
