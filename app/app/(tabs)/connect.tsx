import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Monitor, Wifi, WifiOff, Play, Square, RefreshCw, Terminal, Layers } from "lucide-react-native";
import { VeryTermClient, type VeryTermProject } from "../../services/veryterm-client";

type Tab = "zeroclaw" | "veryterm";

interface Project {
  id: string;
  name: string;
  path: string;
  type: "nextjs" | "rails" | "expo" | "node";
  serverRunning?: boolean;
}

interface CommandResult {
  cmd: string;
  output: string;
  ts: number;
}

const DEFAULT_PROJECTS: Project[] = [
  { id: "vibers-chat", name: "바이버스챗", path: "~/Desktop/macminim4/dev/expo/vibers-chat/app", type: "expo" },
  { id: "faneasy", name: "팬이지", path: "~/Desktop/macminim4/dev/nextjs/apps/faneasy", type: "nextjs" },
  { id: "mission7", name: "Mission7", path: "~/Desktop/macminim4/dev/rails/mission7", type: "rails" },
];

const PROJECT_COMMANDS: Record<string, { label: string; cmd: string }[]> = {
  nextjs: [
    { label: "dev", cmd: "npm run dev" },
    { label: "build", cmd: "npm run build" },
    { label: "git", cmd: "git status" },
  ],
  rails: [
    { label: "server", cmd: "rails server" },
    { label: "console", cmd: "rails console" },
    { label: "git", cmd: "git status" },
  ],
  expo: [
    { label: "start", cmd: "npx expo start" },
    { label: "build", cmd: "eas build -p android --profile preview" },
    { label: "git", cmd: "git status" },
  ],
  node: [
    { label: "start", cmd: "node index.js" },
    { label: "git", cmd: "git status" },
  ],
};

export default function ConnectScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("zeroclaw");

  // ZeroClaw 상태
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("42617");
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<CommandResult[]>([]);
  const [runningCmd, setRunningCmd] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // VeryTerm 상태
  const [vtIp, setVtIp] = useState("");
  const [vtConnected, setVtConnected] = useState(false);
  const [vtConnecting, setVtConnecting] = useState(false);
  const [vtProjects, setVtProjects] = useState<VeryTermProject[]>([]);
  const [vtLoading, setVtLoading] = useState<string | null>(null);
  const vtClientRef = useRef<VeryTermClient | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("zeroclaw_ip").then((v) => v && setIp(v));
    SecureStore.getItemAsync("zeroclaw_port").then((v) => v && setPort(v));
    SecureStore.getItemAsync("zeroclaw_token").then((v) => v && setToken(v));
    SecureStore.getItemAsync("veryterm_ip").then((v) => v && setVtIp(v));
  }, []);

  const handleConnect = async () => {
    if (!ip.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch(`http://${ip}:${port}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: "vibers-chat" }),
      });
      if (!res.ok) throw new Error(`연결 실패: ${res.status}`);
      const data = await res.json();
      const newToken = data.token || data.access_token || "";
      setToken(newToken);
      await SecureStore.setItemAsync("zeroclaw_ip", ip);
      await SecureStore.setItemAsync("zeroclaw_port", port);
      await SecureStore.setItemAsync("zeroclaw_token", newToken);
      connectWS(ip, port, newToken);
    } catch (e: any) {
      Alert.alert("연결 실패", e.message + "\n\n맥미니에서 zeroclaw gateway를 실행했는지 확인해주세요.");
      setConnecting(false);
    }
  };

  const connectWS = (h: string, p: string, t: string) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://${h}:${p}/ws/chat${t ? `?token=${t}` : ""}`);
    ws.onopen = () => { setConnected(true); setConnecting(false); };
    ws.onclose = () => { setConnected(false); setRunningCmd(null); };
    ws.onerror = () => { setConnected(false); setConnecting(false); };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "delta" || msg.type === "done") {
          setLogs((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.ts === msg.ts) {
              return [...prev.slice(0, -1), { ...last, output: last.output + (msg.content || msg.full_response || "") }];
            }
            return [...prev, { cmd: runningCmd || "", output: msg.content || msg.full_response || "", ts: msg.ts || Date.now() }];
          });
          if (msg.type === "done") setRunningCmd(null);
        }
      } catch {}
    };
    wsRef.current = ws;
  };

  const runCommand = (project: Project, cmd: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const fullCmd = `cd ${project.path} && ${cmd}`;
    setRunningCmd(cmd);
    setLogs((prev) => [...prev, { cmd: `[${project.name}] ${cmd}`, output: "", ts: Date.now() }]);
    wsRef.current.send(JSON.stringify({ type: "message", content: `터미널에서 실행해줘: ${fullCmd}` }));
  };

  const disconnect = () => {
    wsRef.current?.close();
    setConnected(false);
    setSelectedProject(null);
  };

  // VeryTerm 연결
  const connectVeryTerm = async () => {
    if (!vtIp.trim()) return;
    setVtConnecting(true);
    const client = new VeryTermClient(vtIp);
    const ok = await client.ping();
    if (ok) {
      vtClientRef.current = client;
      setVtConnected(true);
      await SecureStore.setItemAsync("veryterm_ip", vtIp);
      const projects = await client.getProjects().catch(() => []);
      setVtProjects(projects);
    } else {
      Alert.alert("연결 실패", "VeryTerm이 실행 중인지 확인해주세요.\n맥미니에서 VeryTerm 앱을 켜야 합니다.");
    }
    setVtConnecting(false);
  };

  const vtToggleServer = async (project: VeryTermProject) => {
    if (!vtClientRef.current) return;
    setVtLoading(project.id);
    try {
      if (project.serverRunning) {
        await vtClientRef.current.stopServer(project.id);
      } else {
        await vtClientRef.current.startServer(project.id);
      }
      await new Promise(r => setTimeout(r, 1500));
      const updated = await vtClientRef.current.getProjects();
      setVtProjects(updated);
    } catch (e: any) {
      Alert.alert("오류", e.message);
    }
    setVtLoading(null);
  };

  const typeColor: Record<string, string> = { nextjs: "#0070f3", rails: "#cc0000", expo: "#4630eb", node: "#43853d", next: "#0070f3" };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* 헤더 + 탭 전환 */}
        <View style={styles.header}>
          <Monitor size={28} color="#39FF14" />
          <Text style={styles.title}>PC 연결</Text>
        </View>

        {/* 탭 전환 */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === "zeroclaw" && styles.tabBtnActive]} onPress={() => setActiveTab("zeroclaw")}>
            <Text style={[styles.tabBtnText, activeTab === "zeroclaw" && styles.tabBtnTextActive]}>ZeroClaw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === "veryterm" && styles.tabBtnActive]} onPress={() => setActiveTab("veryterm")}>
            <Layers size={14} color={activeTab === "veryterm" ? "#39FF14" : "#555"} />
            <Text style={[styles.tabBtnText, activeTab === "veryterm" && styles.tabBtnTextActive]}>VeryTerm</Text>
          </TouchableOpacity>
        </View>

        {/* ====== ZeroClaw 탭 ====== */}
        {activeTab === "zeroclaw" && <>

        {/* 연결 상태 */}
        <View style={[styles.statusCard, connected && styles.statusCardOn]}>
          {connected ? <Wifi size={18} color="#39FF14" /> : <WifiOff size={18} color="#555" />}
          <Text style={[styles.statusText, connected && styles.statusTextOn]}>
            {connected ? `${ip}:${port} 연결됨` : "연결 안 됨"}
          </Text>
          {connected && (
            <TouchableOpacity onPress={disconnect} style={styles.disconnectBtn}>
              <Text style={styles.disconnectText}>끊기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 연결 폼 */}
        {!connected && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={ip} onChangeText={setIp}
              placeholder="PC IP (예: 192.168.1.100)" placeholderTextColor="#333"
              keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            <TextInput style={styles.input} value={port} onChangeText={setPort}
              placeholder="포트 (기본: 42617)" placeholderTextColor="#333" keyboardType="number-pad" />
            <TouchableOpacity style={[styles.connectBtn, connecting && styles.connectBtnLoading]}
              onPress={handleConnect} disabled={connecting || !ip.trim()} activeOpacity={0.85}>
              {connecting ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.connectBtnText}>연결하기</Text>}
            </TouchableOpacity>
            <Text style={styles.hint}>맥미니 터미널: <Text style={styles.hintCode}>zeroclaw gateway</Text></Text>
          </View>
        )}

        {/* 프로젝트 탭 */}
        {connected && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectTabScroll}>
              {DEFAULT_PROJECTS.map((p) => (
                <TouchableOpacity key={p.id}
                  style={[styles.projectTab, selectedProject?.id === p.id && styles.projectTabActive]}
                  onPress={() => setSelectedProject(p)} activeOpacity={0.75}>
                  <View style={[styles.typeDot, { backgroundColor: typeColor[p.type] }]} />
                  <Text style={[styles.projectTabText, selectedProject?.id === p.id && styles.projectTabTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 선택된 프로젝트 명령어 */}
            {selectedProject && (
              <View style={styles.commandBox}>
                <Text style={styles.projectPath}>{selectedProject.path}</Text>
                <View style={styles.cmdRow}>
                  {PROJECT_COMMANDS[selectedProject.type].map(({ label, cmd }) => (
                    <TouchableOpacity key={label}
                      style={[styles.cmdBtn, runningCmd === cmd && styles.cmdBtnActive]}
                      onPress={() => runCommand(selectedProject, cmd)}
                      disabled={!!runningCmd} activeOpacity={0.75}>
                      {runningCmd === cmd
                        ? <ActivityIndicator size="small" color="#000" />
                        : label === "dev" || label === "server" || label === "start"
                          ? <Play size={14} color={runningCmd ? "#333" : "#000"} />
                          : label === "build"
                            ? <RefreshCw size={14} color="#000" />
                            : <Terminal size={14} color="#000" />}
                      <Text style={styles.cmdBtnText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                  {runningCmd && (
                    <TouchableOpacity style={styles.stopBtn}
                      onPress={() => { setRunningCmd(null); wsRef.current?.send(JSON.stringify({ type: "interrupt" })); }}>
                      <Square size={14} color="#fff" />
                      <Text style={styles.stopBtnText}>중지</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* 로그 */}
            {logs.length > 0 && (
              <View style={styles.logBox}>
                <View style={styles.logHeader}>
                  <Terminal size={14} color="#39FF14" />
                  <Text style={styles.logTitle}>터미널 출력</Text>
                  <TouchableOpacity onPress={() => setLogs([])} style={styles.clearBtn}>
                    <Text style={styles.clearText}>지우기</Text>
                  </TouchableOpacity>
                </View>
                {logs.map((l, i) => (
                  <View key={i} style={styles.logEntry}>
                    <Text style={styles.logCmd}>{l.cmd}</Text>
                    {l.output ? <Text style={styles.logOutput}>{l.output}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        </>}

        {/* ====== VeryTerm 탭 ====== */}
        {activeTab === "veryterm" && (
          <>
            {/* 연결 상태 */}
            <View style={[styles.statusCard, vtConnected && styles.statusCardOn]}>
              {vtConnected ? <Wifi size={18} color="#39FF14" /> : <WifiOff size={18} color="#555" />}
              <Text style={[styles.statusText, vtConnected && styles.statusTextOn]}>
                {vtConnected ? `VeryTerm 연결됨 (${vtIp})` : "VeryTerm 연결 안 됨"}
              </Text>
              {vtConnected && (
                <TouchableOpacity onPress={() => { setVtConnected(false); vtClientRef.current = null; }} style={styles.disconnectBtn}>
                  <Text style={styles.disconnectText}>끊기</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 연결 폼 */}
            {!vtConnected && (
              <View style={styles.form}>
                <TextInput style={styles.input} value={vtIp} onChangeText={setVtIp}
                  placeholder="맥미니 IP (예: 192.168.1.100)" placeholderTextColor="#333"
                  keyboardType="numbers-and-punctuation" autoCapitalize="none" />
                <TouchableOpacity style={[styles.connectBtn, vtConnecting && styles.connectBtnLoading]}
                  onPress={connectVeryTerm} disabled={vtConnecting || !vtIp.trim()} activeOpacity={0.85}>
                  {vtConnecting ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={styles.connectBtnText}>VeryTerm 연결</Text>}
                </TouchableOpacity>
                <Text style={styles.hint}>맥미니에서 <Text style={styles.hintCode}>VeryTerm 앱</Text>을 켜주세요</Text>
              </View>
            )}

            {/* 프로젝트 목록 */}
            {vtConnected && vtProjects.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionTitle}>PROJECTS</Text>
                {vtProjects.map((p) => (
                  <View key={p.id} style={styles.vtProjectCard}>
                    <View style={styles.vtProjectInfo}>
                      <View style={[styles.typeDot, { backgroundColor: typeColor[p.type] || "#555" }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vtProjectName}>{p.name}</Text>
                        <Text style={styles.vtProjectPath} numberOfLines={1}>{p.path}</Text>
                      </View>
                      <View style={[styles.serverDot, { backgroundColor: p.serverRunning ? "#39FF14" : "#333" }]} />
                    </View>
                    <View style={styles.vtCmdRow}>
                      <TouchableOpacity
                        style={[styles.cmdBtn, p.serverRunning && styles.cmdBtnStop]}
                        onPress={() => vtToggleServer(p)}
                        disabled={vtLoading === p.id}
                      >
                        {vtLoading === p.id
                          ? <ActivityIndicator size="small" color="#000" />
                          : p.serverRunning
                            ? <><Square size={13} color="#fff" /><Text style={[styles.cmdBtnText, { color: "#fff" }]}>중지</Text></>
                            : <><Play size={13} color="#000" /><Text style={styles.cmdBtnText}>시작</Text></>
                        }
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cmdBtnGit}
                        onPress={async () => {
                          if (!vtClientRef.current) return;
                          const out = await vtClientRef.current.run("git status", p.path).catch(e => e.message);
                          Alert.alert("git status", out.slice(0, 500));
                        }}>
                        <Terminal size={13} color="#39FF14" />
                        <Text style={styles.cmdBtnGitText}>git</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={styles.refreshBtn}
                  onPress={async () => {
                    if (!vtClientRef.current) return;
                    const projects = await vtClientRef.current.getProjects().catch(() => []);
                    setVtProjects(projects);
                  }}>
                  <RefreshCw size={14} color="#555" />
                  <Text style={styles.refreshText}>새로고침</Text>
                </TouchableOpacity>
              </View>
            )}

            {vtConnected && vtProjects.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>VeryTerm에 프로젝트를 추가해주세요</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scroll: { padding: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0e0e0e", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1a1a1a" },
  statusCardOn: { borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.04)" },
  statusText: { color: "#444", fontSize: 14, fontWeight: "600", flex: 1 },
  statusTextOn: { color: "#39FF14" },
  disconnectBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#1a1a1a", borderRadius: 8 },
  disconnectText: { color: "#666", fontSize: 12 },
  form: { gap: 10 },
  input: { backgroundColor: "#0e0e0e", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: "#fff", fontSize: 14 },
  connectBtn: { backgroundColor: "#39FF14", borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center", minHeight: 52 },
  connectBtnLoading: { backgroundColor: "rgba(57,255,20,0.5)" },
  connectBtnText: { color: "#000", fontSize: 15, fontWeight: "900" },
  hint: { color: "#333", fontSize: 12, textAlign: "center" },
  hintCode: { color: "#39FF14", fontWeight: "700" },
  sectionTitle: { color: "#39FF14", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  projectTabScroll: { flexGrow: 0 },
  projectTab: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#0e0e0e", borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 8 },
  projectTabActive: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.06)" },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  projectTabText: { color: "#555", fontSize: 13, fontWeight: "700" },
  projectTabTextActive: { color: "#fff" },
  commandBox: { backgroundColor: "#0e0e0e", borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  projectPath: { color: "#333", fontSize: 11, fontFamily: "monospace" },
  cmdRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  cmdBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#39FF14", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cmdBtnActive: { backgroundColor: "rgba(57,255,20,0.5)" },
  cmdBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },
  stopBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#cc0000", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  stopBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  logBox: { backgroundColor: "#080808", borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  logTitle: { color: "#39FF14", fontSize: 12, fontWeight: "700", flex: 1 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#1a1a1a", borderRadius: 6 },
  clearText: { color: "#555", fontSize: 11 },
  logEntry: { gap: 4, borderLeftWidth: 2, borderLeftColor: "#1a1a1a", paddingLeft: 10 },
  logCmd: { color: "#39FF14", fontSize: 11, fontFamily: "monospace" },
  logOutput: { color: "#888", fontSize: 12, fontFamily: "monospace", lineHeight: 18 },
  // Tab switcher
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#0e0e0e", borderRadius: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  tabBtnActive: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.06)" },
  tabBtnText: { color: "#555", fontSize: 14, fontWeight: "700" },
  tabBtnTextActive: { color: "#39FF14" },
  // VeryTerm project cards
  vtProjectCard: { backgroundColor: "#0e0e0e", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1a1a1a", gap: 10 },
  vtProjectInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  vtProjectName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  vtProjectPath: { color: "#333", fontSize: 11, fontFamily: "monospace", flex: 1 },
  serverDot: { width: 8, height: 8, borderRadius: 4 },
  vtCmdRow: { flexDirection: "row", gap: 8 },
  cmdBtnStop: { backgroundColor: "#cc0000" },
  cmdBtnGit: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1a1a1a", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cmdBtnGitText: { color: "#888", fontSize: 13, fontWeight: "700" },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#0e0e0e", borderRadius: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  refreshText: { color: "#555", fontSize: 13, fontWeight: "700" },
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#333", fontSize: 14 },
});
