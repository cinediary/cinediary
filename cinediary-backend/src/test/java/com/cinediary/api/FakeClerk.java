package com.cinediary.api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public final class FakeClerk
{
    public static final String SECRET_KEY = "sk_test_cinediary";

    private final HttpServer server;
    private final Set<String> deleted = ConcurrentHashMap.newKeySet();
    private final AtomicBoolean down = new AtomicBoolean(false);

    private FakeClerk(HttpServer server)
    {
        this.server = server;
    }

    public static FakeClerk start()
    {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            FakeClerk fake = new FakeClerk(server);
            server.createContext("/", fake::handle);
            server.start();
            return fake;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public String baseUrl()
    {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
    }

    public boolean wasDeleted(String clerkId)
    {
        return deleted.contains(clerkId);
    }

    public void setDown(boolean value)
    {
        down.set(value);
    }

    private void handle(HttpExchange ex) throws IOException
    {
        String path = ex.getRequestURI().getPath();
        if (!("Bearer " + SECRET_KEY).equals(ex.getRequestHeaders().getFirst("Authorization"))) {
            respond(ex, 401, "{\"errors\":[{\"code\":\"authentication_invalid\"}]}");
        } else if (down.get()) {
            respond(ex, 500, "{\"errors\":[{\"code\":\"internal_clerk_error\"}]}");
        } else if ("DELETE".equals(ex.getRequestMethod()) && path.startsWith("/v1/users/")) {
            String clerkId = path.substring("/v1/users/".length());
            if (deleted.add(clerkId)) {
                respond(ex, 200, "{\"object\":\"user\",\"id\":\"%s\",\"deleted\":true}".formatted(clerkId));
            } else {
                respond(ex, 404, "{\"errors\":[{\"code\":\"resource_not_found\"}]}");
            }
        } else {
            respond(ex, 404, "{\"errors\":[{\"code\":\"resource_not_found\"}]}");
        }
    }

    private static void respond(HttpExchange ex, int status, String body) throws IOException
    {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }
}
