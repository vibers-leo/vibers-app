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

  constructor(ip: string, port = 3456) {
    this.base = `http://${ip}:${port}`;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/ping`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getProjects(): Promise<VeryTermProject[]> {
    const res = await fetch(`${this.base}/projects`);
    if (!res.ok) throw new Error("프로젝트 목록 불러오기 실패");
    return res.json();
  }

  async startServer(projectId: string): Promise<void> {
    const res = await fetch(`${this.base}/projects/${projectId}/server/start`, { method: "POST" });
    if (!res.ok) throw new Error("서버 시작 실패");
  }

  async stopServer(projectId: string): Promise<void> {
    const res = await fetch(`${this.base}/projects/${projectId}/server/stop`, { method: "POST" });
    if (!res.ok) throw new Error("서버 중지 실패");
  }

  async run(command: string, cwd?: string): Promise<string> {
    const res = await fetch(`${this.base}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, cwd }),
    });
    if (!res.ok) throw new Error("명령 실행 실패");
    const data = await res.json();
    return data.output || "";
  }
}
