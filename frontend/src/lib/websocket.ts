type MessageHandler = (data: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public connect(token?: string) {
    if (typeof window === "undefined" || this.ws || this.isConnecting) return;

    // Do not attempt dead localhost websocket connections on Vercel or remote SSL without explicit URL
    const isVercel =
      window.location.hostname.includes("vercel.app") ||
      Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);
    if (isVercel && !process.env.NEXT_PUBLIC_WS_URL) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isConnecting = true;
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (typeof window !== "undefined") {
      const isLocalhostClient = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isLocalhostClient && wsUrl && (wsUrl.includes("localhost") || wsUrl.includes("127.0.0.1"))) {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.hostname}:8000/ws/v1/realtime`;
      }
    }
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
        this.reconnectAttempts = 0;
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
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts += 1;
          const delay = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts), 20000);
          if (!this.reconnectTimeout) {
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectTimeout = null;
              this.connect(token);
            }, delay);
          }
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
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
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }
}

export const realtime = new RealtimeClient();
