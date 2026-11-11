type MessageHandler = (data: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  public connect(token?: string) {
    if (typeof window === "undefined" || this.ws || this.isConnecting) return;

    this.isConnecting = true;
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl && typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      wsUrl = `${protocol}//${host}:8000/ws/v1/realtime`;
    } else if (!wsUrl) {
      wsUrl = "ws://localhost:8000/ws/v1/realtime";
    }
    const finalUrl = token ? `${wsUrl}?token=${token}` : wsUrl;

    try {
      this.ws = new WebSocket(finalUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log("[Muchad Realtime] WebSocket connection established");
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(parsed));
        } catch {
          // Plaintext or ping/pong
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect(token);
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.isConnecting = false;
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
  }
}

export const realtime = new RealtimeClient();

