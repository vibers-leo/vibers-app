import * as SecureStore from "expo-secure-store";

export interface VeryTermProject {
  id: string;
  name: string;
  path: string;
  type: string;
  serverCommand?: string;
  serverRunning: boolean;
}

export class VeryTermClient {
  private base: string;
  private token: string | null = null;

  constructor(ip: string, port = 3456) {
    this.base = `http://${ip}:${port}`;
  }

  get baseUrl() { return this.base; }

  setToken(t: string | null) { this.token = t; }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/ping`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** 페어링 코드 요청 (인증 불필요) */
  async getPairingCode(): Promise<{ code: string; expiresIn: number } | null> {
    try {
      const res = await fetch(`${this.base}/auth/code`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  /** 페어링 코드로 인증 → 토큰 발급 */
  async pair(code: string, deviceName: string): Promise<{ token: string } | null> {
    try {
      const res = await fetch(`${this.base}/auth/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, deviceName }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.token) {
        this.token = data.token;
        return { token: data.token };
      }
      return null;
    } catch {
      return null;
    }
  }

  /** 토큰 유효성 검증 */
  async verifyToken(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/auth/verify`, { headers: this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getProjects(): Promise<VeryTermProject[]> {
    const res = await fetch(`${this.base}/projects`, { headers: this.headers() });
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    if (!res.ok) throw new Error("프로젝트 목록 불러오기 실패");
    return res.json();
  }

  async startServer(projectId: string): Promise<void> {
    const res = await fetch(`${this.base}/projects/${projectId}/server/start`, {
      method: "POST", headers: this.headers(),
    });
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    if (!res.ok) throw new Error("서버 시작 실패");
  }

  async stopServer(projectId: string): Promise<void> {
    const res = await fetch(`${this.base}/projects/${projectId}/server/stop`, {
      method: "POST", headers: this.headers(),
    });
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    if (!res.ok) throw new Error("서버 중지 실패");
  }

  /** 터미널 세션에 WebSocket 연결 (실시간 스트리밍) */
  connectTerminal(
    projectId: string,
    type: "main" | "server",
    onOutput: (data: string) => void,
    onClose?: () => void,
  ): { send: (data: string) => void; close: () => void } {
    const wsBase = this.base.replace("http://", "ws://");
    const params = new URLSearchParams({ project: projectId, type });
    if (this.token) params.set("token", this.token);
    const ws = new WebSocket(`${wsBase}/ws/terminal?${params}`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "output" && msg.data) {
          onOutput(msg.data);
        }
      } catch {}
    };

    ws.onclose = () => onClose?.();
    ws.onerror = () => onClose?.();

    return {
      send: (data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      },
      close: () => ws.close(),
    };
  }

  /** 최근 터미널 이벤트 조회 */
  async getEvents(): Promise<any[]> {
    const res = await fetch(`${this.base}/events`, { headers: this.headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  }

  async run(command: string, cwd?: string): Promise<string> {
    const res = await fetch(`${this.base}/run`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ command, cwd }),
    });
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    if (!res.ok) throw new Error("명령 실행 실패");
    const data = await res.json();
    return data.output || "";
  }
}

// ── 싱글턴 공유 인스턴스 ──

let _client: VeryTermClient | null = null;
let _projects: VeryTermProject[] = [];
let _listeners: (() => void)[] = [];
let _paired = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getSharedClient(): VeryTermClient | null {
  return _client;
}

export function getSharedProjects(): VeryTermProject[] {
  return _projects;
}

export function isConnected(): boolean {
  return _client !== null;
}

export function isPaired(): boolean {
  return _paired;
}

/** IP 연결 (ping만 확인, 인증은 별도) */
export async function connectShared(ip: string): Promise<boolean> {
  const client = new VeryTermClient(ip);
  const ok = await client.ping();
  if (!ok) return false;

  _client = client;
  await SecureStore.setItemAsync("veryterm_ip", ip);

  // 저장된 토큰으로 자동 인증 시도
  const savedToken = await SecureStore.getItemAsync("veryterm_token");
  if (savedToken) {
    client.setToken(savedToken);
    const valid = await client.verifyToken();
    if (valid) {
      _paired = true;
      _projects = await client.getProjects().catch(() => []);
      notify();
      return true;
    }
    // 토큰 만료 → 재페어링 필요
    client.setToken(null);
    await SecureStore.deleteItemAsync("veryterm_token");
  }

  // 인증 없이도 ping은 성공 → 연결은 됐지만 페어링 필요
  // PC가 인증 미지원(구버전)이면 토큰 없이도 프로젝트 로드 시도
  try {
    _projects = await client.getProjects();
    _paired = true; // 인증 없이 성공 = 구버전 VeryTerm
    notify();
    return true;
  } catch (e: any) {
    if (e.message === "AUTH_REQUIRED") {
      _paired = false;
      notify();
      return true; // 연결은 됐지만 페어링 필요
    }
    return false;
  }
}

/** 페어링 코드로 인증 */
export async function pairWithCode(code: string): Promise<boolean> {
  if (!_client) return false;
  const result = await _client.pair(code, "바이버스챗 모바일");
  if (!result) return false;

  await SecureStore.setItemAsync("veryterm_token", result.token);
  _paired = true;
  _projects = await _client.getProjects().catch(() => []);
  notify();
  return true;
}

export function disconnectShared() {
  _client = null;
  _projects = [];
  _paired = false;
  notify();
}

/** 토큰 삭제 + 연결 해제 */
export async function unpair() {
  await SecureStore.deleteItemAsync("veryterm_token");
  disconnectShared();
}

export async function refreshProjects(): Promise<VeryTermProject[]> {
  if (!_client) return [];
  try {
    _projects = await _client.getProjects();
    notify();
  } catch (e: any) {
    if (e.message === "AUTH_REQUIRED") {
      _paired = false;
      notify();
    }
  }
  return _projects;
}

export function onConnectionChange(fn: () => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((l) => l !== fn); };
}

export async function autoConnect(): Promise<boolean> {
  const ip = await SecureStore.getItemAsync("veryterm_ip");
  if (!ip) return false;
  return connectShared(ip);
}

export function projectsToPromptContext(): string {
  if (!_client || _projects.length === 0) return "";
  const lines = _projects.map((p) =>
    `- ${p.name} (${p.type}, ${p.path}, 서버: ${p.serverRunning ? "실행중" : "중지"})`
  );
  return [
    "\n[VeryTerm PC 제어 가능]",
    "연결된 PC의 프로젝트:",
    ...lines,
    "",
    "사용자가 PC 명령 실행을 요청하면, 응답에 아래 JSON을 포함하세요:",
    '```veryterm',
    '{"command": "실행할 명령어", "cwd": "작업 디렉토리 경로"}',
    '```',
    "명령 결과는 자동으로 전달됩니다. 일반 대화는 평소처럼 답변하세요.",
  ].join("\n");
}
