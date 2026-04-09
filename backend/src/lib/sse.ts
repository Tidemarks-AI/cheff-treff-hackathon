import type { Response } from "express";

const sseClients = new Set<Response>();

export function addSSEClient(res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(": connected\n\n");
  sseClients.add(res);

  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15_000);

  res.on("close", () => {
    clearInterval(keepalive);
    sseClients.delete(res);
  });
}

export function broadcastSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}
