import java.io.*;
import java.net.*;
import java.nio.file.*;

/*
 * TCP File Server
 * Waits for a client to send a filename, then sends back the file's
 * contents if it exists, or an error message if it does not.
 *
 * Compile: javac FileServer.java
 * Run:     java FileServer [port]        (default port 5000)
 */
public class FileServer {

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 5000;
        Path baseDir = Paths.get("").toAbsolutePath().normalize();

        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println("Server started on port " + port);
            System.out.println("Serving files from: " + baseDir);

            while (true) {
                Socket socket = serverSocket.accept();
                System.out.println("Client connected: " + socket.getInetAddress());
                new Thread(() -> handleClient(socket, baseDir)).start();
            }
        }
    }

    private static void handleClient(Socket socket, Path baseDir) {
        try (Socket s = socket;
             BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()));
             PrintWriter out = new PrintWriter(s.getOutputStream(), true)) {

            String fileName = in.readLine();
            if (fileName == null || fileName.trim().isEmpty()) {
                out.println("ERROR: No filename received");
                return;
            }
            fileName = fileName.trim();
            System.out.println("Requested file: " + fileName);

            // Only allow files inside the server's folder
            Path file = baseDir.resolve(fileName).normalize();
            if (!file.startsWith(baseDir) || !Files.isRegularFile(file)) {
                out.println("ERROR: File '" + fileName + "' not found");
                System.out.println("File not found: " + fileName);
                return;
            }

            out.println("OK");
            try (BufferedReader reader = Files.newBufferedReader(file)) {
                String line;
                while ((line = reader.readLine()) != null) {
                    out.println(line);
                }
            }
            System.out.println("File sent: " + fileName);
        } catch (IOException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }
}
