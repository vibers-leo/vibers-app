import * as SecureStore from "expo-secure-store";

// ── 타입 ──

export interface ZeroClawMessage {
  type: "chunk" | "thinking" | "tool_call" | "tool_result" | "done" | "error" | "session_start" | "connected" | "chunk_reset";
  content?: string;
  name?: string;
  args?: any;
  output?: string;
  full_response?: string;
  message?: string;
  code?: string;
  session_id?: string;
  resumed?: boolean;
  message_count?: number;
}

export type ZeroClawEventHandler = (msg: ZeroClawMessage) => void;

// ── 저장 키 ──

const STORE = {
  ip: "zeroclaw_ip",
  port: "zeroclaw_port",
  token: "zeroclaw_token",
  sessionId: "zeroclaw_session_id",
};

// ── 클라이언트 ──

class ZeroClawClient {
  private base: string;
  private wsUrl: string;
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private handlers: Map<string, ZeroClawEventHandler[]> = new Map();

  constructor(ip: string, port = 8080) {
    this.base = `http://${ip}:${port}`;
    this.wsUrl = `ws://${ip}:${port}`;
  }

  setToken(t: string | null) { this.token = t; }
  getToken() { return this.token; }
  getSessionId() { return this.sessionId; }

  // ── HTTP ──

  async health(): Promise<{ status: string; paired: boolean; require_pairing: boolean } | null> {
    try {
      const res = await fetch(`${this.base}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async pair(code: string, deviceName = "바이버스챗 모바일"): Promise<string | null> {
    try {
      const res = await fetch(`${this.base}/api/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, device_name: deviceName, device_type: "mobile" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `페어링 실패 (${res.status})`);
      }
      const data = await res.json();
      if (data.token) {
        this.token = data.token;
        return data.token;
      }
      return null;
    } catch (e: any) {
      throw e;
    }
  }

  async getDevices(): Promise<any[]> {
    const res = await fetch(`${this.base}/api/devices`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.devices || [];
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  // ── WebSocket ──

  openChat(sessionId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        try { this.ws.close(); } catch {}
      }

      this.sessionId = sessionId || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const params = new URLSearchParams();
      if (this.token) params.set("token", this.token);
      params.set("session_id", this.sessionId);

      const url = `${this.wsUrl}/ws/chat?${params.toString()}`;
      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        reject(new Error("WebSocket 연결 타임아웃"));
        ws.close();
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.ws = ws;
        // 연결 핸드셰이크
        ws.send(JSON.stringify({
          type: "connect",
          device_name: "바이버스챗 모바일",
          capabilities: ["streaming", "tool_use"],
        }));
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg: ZeroClawMessage = JSON.parse(event.data);
          this.emit(msg.type, msg);
          // 모든 메시지를 "message" 이벤트로도 전달
          this.emit("message", msg);
        } catch {}
      };

      ws.onerror = (e: any) => {
        clearTimeout(timeout);
        this.emit("error", { type: "error", message: e.message || "WebSocket 오류" });
      };

      ws.onclose = () => {
        this.ws = null;
        this.emit("close", { type: "error", message: "연결 종료" });
      };
    });
  }

  sendMessage(content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket이 연결되지 않았습니다");
    }
    this.ws.send(JSON.stringify({ type: "message", content }));
  }

  isWsConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  closeChat() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  // ── 이벤트 ──

  on(event: string, handler: ZeroClawEventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => {
      const arr = this.handlers.get(event);
      if (arr) this.handlers.set(event, arr.filter((h) => h !== handler));
    };
  }

  private emit(event: string, msg: ZeroClawMessage) {
    this.handlers.get(event)?.forEach((h) => h(msg));
  }

  off(event: string) {
    this.handlers.delete(event);
  }

  clearHandlers() {
    this.handlers.clear();
  }
}

// ── 싱글턴 공유 인스턴스 ──

let _client: ZeroClawClient | null = null;
let _connected = false;
let _paired = false;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getZCClient(): ZeroClawClient | null {
  return _client;
}

export function isZCConnected(): boolean {
  return _connected && _paired;
}

export function isZCWsOpen(): boolean {
  return _client?.isWsConnected() ?? false;
}

export async function connectZC(ip: string, port = 8080): Promise<{ connected: boolean; needsPairing: boolean }> {
  const client = new ZeroClawClient(ip, port);
  const health = await client.health();
  if (!health) return { connected: false, needsPairing: false };

  _client = client;
  _connected = true;
  await SecureStore.setItemAsync(STORE.ip, ip);
  await SecureStore.setItemAsync(STORE.port, String(port));

  // 저장된 토큰으로 자동 인증 시도
  const savedToken = await SecureStore.getItemAsync(STORE.token);
  if (savedToken) {
    client.setToken(savedToken);
    // health에서 paired 확인 또는 디바이스 목록으로 검증
    const devices = await client.getDevices().catch(() => []);
    if (devices.length >= 0 && savedToken) {
      // 토큰이 유효하면 (401이 안 나면) 페어링 완료
      _paired = true;
      // 저장된 세션 복원
      const savedSession = await SecureStore.getItemAsync(STORE.sessionId);
      if (savedSession) {
        try {
          await client.openChat(savedSession);
        } catch {
          // 세션 복원 실패 → 새 세션
          await client.openChat().catch(() => {});
        }
      }
      notify();
      return { connected: true, needsPairing: false };
    }
    // 토큰 무효
    client.setToken(null);
    await SecureStore.deleteItemAsync(STORE.token);
  }

  // 페어링 불필요 서버인 경우
  if (!health.require_pairing) {
    _paired = true;
    await client.openChat().catch(() => {});
    notify();
    return { connected: true, needsPairing: false };
  }

  notify();
  return { connected: true, needsPairing: true };
}

export async function pairZC(code: string): Promise<boolean> {
  if (!_client) return false;
  try {
    const token = await _client.pair(code);
    if (!token) return false;
    await SecureStore.setItemAsync(STORE.token, token);
    _paired = true;
    // WebSocket 연결
    await _client.openChat().catch(() => {});
    // 세션 ID 저장
    const sid = _client.getSessionId();
    if (sid) await SecureStore.setItemAsync(STORE.sessionId, sid);
    notify();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectZC() {
  _client?.closeChat();
  _client?.clearHandlers();
  _client = null;
  _connected = false;
  _paired = false;
  await SecureStore.deleteItemAsync(STORE.token);
  await SecureStore.deleteItemAsync(STORE.sessionId);
  notify();
}

export async function autoConnectZC(): Promise<boolean> {
  const ip = await SecureStore.getItemAsync(STORE.ip);
  if (!ip) return false;
  const port = parseInt(await SecureStore.getItemAsync(STORE.port) || "8080", 10);
  const result = await connectZC(ip, port);
  return result.connected && !result.needsPairing;
}

export function onZCChange(fn: () => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((l) => l !== fn); };
}
