import java.io.*;
import java.net.*;
import java.util.Scanner;

/*
 * TCP File Client
 * Sends a filename to the server and prints the contents it receives.
 *
 * Compile: javac FileClient.java
 * Run:     java FileClient [host] [port]  (default localhost 5000)
 */
public class FileClient {

    public static void main(String[] args) {
        String host = args.length > 0 ? args[0] : "localhost";
        int port = args.length > 1 ? Integer.parseInt(args[1]) : 5000;

        Scanner sc = new Scanner(System.in);
        System.out.print("Enter filename: ");
        String fileName = sc.nextLine();

        try (Socket socket = new Socket(host, port);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {

            out.println(fileName);

            String status = in.readLine();
            if (status == null) {
                System.out.println("No response from server");
            } else if (status.equals("OK")) {
                System.out.println("----- Contents of " + fileName + " -----");
                String line;
                while ((line = in.readLine()) != null) {
                    System.out.println(line);
                }
                System.out.println("----- End of file -----");
            } else {
                System.out.println(status);
            }
        } catch (IOException e) {
            System.out.println("Could not connect to server: " + e.getMessage());
        }
        sc.close();
    }
}
