import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Monitor, Wifi, WifiOff, Play, Square, RefreshCw, Terminal, Send, ChevronDown, ChevronUp, Lock, Unlock, Zap, Activity } from "lucide-react-native";
import {
  type VeryTermProject,
  getSharedClient, getSharedProjects, isConnected as vtIsConnected, isPaired as vtIsPaired,
  connectShared, disconnectShared, refreshProjects, onConnectionChange, autoConnect, pairWithCode, unpair,
} from "../../services/veryterm-client";
import {
  isZCConnected, connectZC, pairZC, disconnectZC, autoConnectZC, onZCChange,
} from "../../services/zeroclaw-client";

interface CommandLog {
  cmd: string;
  output: string;
  ts: number;
  project?: string;
}

const PROJECT_COMMANDS: Record<string, { label: string; cmd: string }[]> = {
  nextjs: [
    { label: "dev", cmd: "npm run dev" },
    { label: "build", cmd: "npm run build" },
    { label: "lint", cmd: "npm run lint" },
    { label: "git status", cmd: "git status" },
    { label: "git pull", cmd: "git pull" },
  ],
  next: [
    { label: "dev", cmd: "npm run dev" },
    { label: "build", cmd: "npm run build" },
    { label: "git status", cmd: "git status" },
    { label: "git pull", cmd: "git pull" },
  ],
  rails: [
    { label: "server", cmd: "rails server" },
    { label: "console", cmd: "rails console" },
    { label: "migrate", cmd: "rails db:migrate" },
    { label: "git status", cmd: "git status" },
    { label: "git pull", cmd: "git pull" },
  ],
  expo: [
    { label: "start", cmd: "npx expo start" },
    { label: "doctor", cmd: "npx expo-doctor" },
    { label: "build", cmd: "eas build -p android --profile preview" },
    { label: "git status", cmd: "git status" },
    { label: "git pull", cmd: "git pull" },
  ],
  node: [
    { label: "start", cmd: "node index.js" },
    { label: "git status", cmd: "git status" },
    { label: "git pull", cmd: "git pull" },
  ],
};

const typeColor: Record<string, string> = { nextjs: "#0070f3", next: "#0070f3", rails: "#cc0000", expo: "#4630eb", node: "#43853d" };

type Tab = "zeroclaw" | "veryterm" | "progress";

interface ProgressEvent {
  type: string;
  message: string;
  projectId: string;
  timestamp: number;
}

export default function ConnectScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("zeroclaw");

  // VeryTerm 상태
  const [ip, setIp] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [paired, setPaired] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [pairing, setPairing] = useState(false);
  const [projects, setProjects] = useState<VeryTermProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<VeryTermProject | null>(null);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [runningCmd, setRunningCmd] = useState<string | null>(null);
  const [freeCmd, setFreeCmd] = useState("");
  const [vtLoading, setVtLoading] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  // ZeroClaw 상태
  const [zcIp, setZcIp] = useState("");
  const [zcPort, setZcPort] = useState("42617");
  const [zcConnected, setZcConnected] = useState(false);
  const [zcConnecting, setZcConnecting] = useState(false);
  const [zcNeedsPairing, setZcNeedsPairing] = useState(false);
  const [zcPairingCode, setZcPairingCode] = useState("");
  const [zcPairing, setZcPairing] = useState(false);

  // 진행현황 이벤트
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);

  const scrollRef = useRef<ScrollView>(null);

  // VeryTerm 동기화
  const syncState = useCallback(() => {
    setConnected(vtIsConnected());
    setPaired(vtIsPaired());
    setProjects(getSharedProjects());
  }, []);

  // ZeroClaw 동기화
  const syncZC = useCallback(() => {
    setZcConnected(isZCConnected());
  }, []);

  // 이벤트 구독 (VeryTerm WS)
  useEffect(() => {
    if (!vtIsConnected() || !vtIsPaired()) return;
    const client = getSharedClient();
    if (!client) return;
    const unsub = client.subscribeEvents((ev) => {
      setProgressEvents((prev) => [ev, ...prev].slice(0, 100));
    });
    return unsub;
  }, [connected, paired]);

  useEffect(() => {
    const unsub1 = onConnectionChange(syncState);
    const unsub2 = onZCChange(syncZC);
    SecureStore.getItemAsync("veryterm_ip").then((v) => v && setIp(v));
    SecureStore.getItemAsync("zeroclaw_ip").then((v) => v && setZcIp(v));
    SecureStore.getItemAsync("zeroclaw_port").then((v) => v && setZcPort(v || "42617"));
    // 자동 연결 시도
    autoConnect().then(syncState);
    autoConnectZC().then(syncZC);
    return () => { unsub1(); unsub2(); };
  }, []);

  useFocusEffect(useCallback(() => {
    syncState();
    syncZC();
    if (vtIsConnected()) refreshProjects().then(() => syncState());
  }, []));

  // ── ZeroClaw 핸들러 ──
  const handleZCConnect = async () => {
    if (!zcIp.trim()) return;
    setZcConnecting(true);
    const result = await connectZC(zcIp, parseInt(zcPort) || 8080);
    if (result.connected) {
      setZcNeedsPairing(result.needsPairing);
      syncZC();
    } else {
      Alert.alert("연결 실패", "ZeroClaw가 실행 중인지 확인해주세요.\nPC에서 zeroclaw gateway를 실행하세요.");
    }
    setZcConnecting(false);
  };

  const handleZCPair = async () => {
    if (zcPairingCode.length < 4) {
      Alert.alert("오류", "페어링 코드를 입력해주세요");
      return;
    }
    setZcPairing(true);
    const ok = await pairZC(zcPairingCode);
    if (ok) {
      setZcNeedsPairing(false);
      setZcPairingCode("");
      syncZC();
    } else {
      Alert.alert("페어링 실패", "코드가 일치하지 않습니다.");
    }
    setZcPairing(false);
  };

  const handleZCDisconnect = async () => {
    await disconnectZC();
    setZcNeedsPairing(false);
    setZcPairingCode("");
    syncZC();
  };

  const handleConnect = async () => {
    if (!ip.trim()) return;
    setConnecting(true);
    const ok = await connectShared(ip);
    if (ok) {
      syncState();
    } else {
      Alert.alert("연결 실패", "VeryTerm이 실행 중인지 확인해주세요.\n맥미니에서 VeryTerm 앱을 켜야 합니다.");
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await unpair();
    syncState();
    setSelectedProject(null);
    setLogs([]);
    setPairingCode("");
  };

  const handlePair = async () => {
    if (pairingCode.length !== 6) {
      Alert.alert("오류", "6자리 페어링 코드를 입력해주세요");
      return;
    }
    setPairing(true);
    const ok = await pairWithCode(pairingCode);
    if (ok) {
      syncState();
      setPairingCode("");
    } else {
      Alert.alert("페어링 실패", "코드가 일치하지 않습니다.\nPC 화면의 코드를 다시 확인해주세요.");
    }
    setPairing(false);
  };

  const runCommand = async (cmd: string, project?: VeryTermProject) => {
    const client = getSharedClient();
    if (!client) return;
    const cwd = project?.path;
    const label = project ? `[${project.name}] ${cmd}` : cmd;
    setRunningCmd(cmd);
    setLogs((prev) => [...prev, { cmd: label, output: "실행 중...", ts: Date.now(), project: project?.name }]);

    try {
      const output = await client.run(cmd, cwd);
      setLogs((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], output: output || "(출력 없음)" };
        return updated;
      });
    } catch (e: any) {
      setLogs((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], output: `오류: ${e.message}` };
        return updated;
      });
    }
    setRunningCmd(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const toggleServer = async (project: VeryTermProject) => {
    const client = getSharedClient();
    if (!client) return;
    setVtLoading(project.id);
    try {
      if (project.serverRunning) {
        await client.stopServer(project.id);
      } else {
        await client.startServer(project.id);
      }
      await new Promise((r) => setTimeout(r, 1500));
      await refreshProjects();
      syncState();
    } catch (e: any) {
      Alert.alert("오류", e.message);
    }
    setVtLoading(null);
  };

  const sendFreeCmd = () => {
    if (!freeCmd.trim()) return;
    runCommand(freeCmd.trim(), selectedProject || undefined);
    setFreeCmd("");
  };

  const visibleProjects = showAllProjects ? projects : projects.slice(0, 4);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* 헤더 */}
        <View style={styles.header}>
          <Monitor size={28} color="#39FF14" />
          <Text style={styles.title}>PC 연결</Text>
          {(zcConnected || (connected && paired)) && <View style={styles.liveDot} />}
        </View>

        {/* 탭 전환 */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === "zeroclaw" && styles.tabBtnActive]} onPress={() => setActiveTab("zeroclaw")}>
            <Zap size={14} color={activeTab === "zeroclaw" ? "#39FF14" : "#555"} />
            <Text style={[styles.tabBtnText, activeTab === "zeroclaw" && styles.tabBtnTextActive]}>ZeroClaw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === "veryterm" && styles.tabBtnActive]} onPress={() => setActiveTab("veryterm")}>
            <Terminal size={14} color={activeTab === "veryterm" ? "#39FF14" : "#555"} />
            <Text style={[styles.tabBtnText, activeTab === "veryterm" && styles.tabBtnTextActive]}>VeryTerm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === "progress" && styles.tabBtnActive]} onPress={() => setActiveTab("progress")}>
            <Activity size={14} color={activeTab === "progress" ? "#39FF14" : "#555"} />
            <Text style={[styles.tabBtnText, activeTab === "progress" && styles.tabBtnTextActive]}>진행현황</Text>
            {progressEvents.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{progressEvents.length > 99 ? "99+" : progressEvents.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* ====== ZeroClaw 탭 ====== */}
        {activeTab === "zeroclaw" && (<>
          {/* 연결 상태 */}
          <View style={[styles.statusCard, zcConnected && styles.statusCardOn, !zcConnected && zcNeedsPairing && styles.statusCardWarn]}>
            {zcConnected ? <Zap size={18} color="#39FF14" /> : <WifiOff size={18} color="#555" />}
            <Text style={[styles.statusText, zcConnected && styles.statusTextOn]}>
              {zcConnected ? `ZeroClaw 연결됨 (${zcIp})` : zcNeedsPairing ? `페어링 필요 (${zcIp})` : "ZeroClaw 연결 안 됨"}
            </Text>
            {zcConnected && (
              <TouchableOpacity onPress={handleZCDisconnect} style={styles.disconnectBtn}>
                <Text style={styles.disconnectText}>끊기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ZeroClaw 연결 폼 */}
          {!zcConnected && !zcNeedsPairing && (
            <View style={styles.form}>
              <TextInput style={styles.input} value={zcIp} onChangeText={setZcIp}
                placeholder="PC IP (예: 192.168.219.101)" placeholderTextColor="#333"
                keyboardType="numbers-and-punctuation" autoCapitalize="none" />
              <TextInput style={styles.input} value={zcPort} onChangeText={setZcPort}
                placeholder="포트 (기본: 42617)" placeholderTextColor="#333" keyboardType="number-pad" />
              <TouchableOpacity style={[styles.connectBtn, zcConnecting && styles.connectBtnLoading]}
                onPress={handleZCConnect} disabled={zcConnecting || !zcIp.trim()} activeOpacity={0.85}>
                {zcConnecting ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.connectBtnText}>ZeroClaw 연결</Text>}
              </TouchableOpacity>
              <Text style={styles.hint}>PC에서 <Text style={styles.hintCode}>zeroclaw gateway</Text>를 실행하세요</Text>
            </View>
          )}

          {/* ZeroClaw 페어링 */}
          {!zcConnected && zcNeedsPairing && (
            <View style={styles.pairingCard}>
              <Text style={styles.pairingTitle}>⚡ ZeroClaw 페어링</Text>
              <Text style={styles.pairingDesc}>PC 터미널에 표시된 페어링 코드를 입력하세요</Text>
              <TextInput
                style={styles.pairingInput}
                value={zcPairingCode}
                onChangeText={setZcPairingCode}
                placeholder="코드 입력"
                placeholderTextColor="#333"
                autoCapitalize="characters"
                textAlign="center"
              />
              <TouchableOpacity
                style={[styles.connectBtn, (zcPairingCode.length < 4 || zcPairing) && styles.connectBtnLoading]}
                onPress={handleZCPair}
                disabled={zcPairingCode.length < 4 || zcPairing}
              >
                {zcPairing ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.connectBtnText}>페어링</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ZeroClaw 연결 완료 */}
          {zcConnected && (
            <View style={styles.zcInfoCard}>
              <Zap size={20} color="#39FF14" />
              <View style={{ flex: 1 }}>
                <Text style={styles.zcInfoTitle}>💬 바이버스챗 AI 활성</Text>
                <Text style={styles.zcInfoDesc}>채팅 탭에서 바이버스챗 AI가 처리합니다.{"\n"}API 키 불필요 · 도구 자동 실행 · 세션 영속</Text>
              </View>
            </View>
          )}
        </>)}

        {/* ====== VeryTerm 탭 ====== */}
        {activeTab === "veryterm" && (<>

        {/* 연결 상태 */}
        <View style={[styles.statusCard, connected && paired && styles.statusCardOn, connected && !paired && styles.statusCardWarn]}>
          {connected && paired ? <Unlock size={18} color="#39FF14" /> : connected ? <Lock size={18} color="#ff9900" /> : <WifiOff size={18} color="#555" />}
          <Text style={[styles.statusText, connected && paired && styles.statusTextOn, connected && !paired && styles.statusTextWarn]}>
            {connected && paired ? `PC 연결됨 (${ip})` : connected ? `페어링 필요 (${ip})` : "연결 안 됨"}
          </Text>
          {connected && (
            <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
              <Text style={styles.disconnectText}>끊기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 페어링 코드 입력 */}
        {connected && !paired && (
          <View style={styles.pairingCard}>
            <Text style={styles.pairingTitle}>🔐 PC 페어링</Text>
            <Text style={styles.pairingDesc}>PC 화면에 표시된 6자리 코드를 입력하세요</Text>
            <TextInput
              style={styles.pairingInput}
              value={pairingCode}
              onChangeText={(v) => setPairingCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#333"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            <TouchableOpacity
              style={[styles.connectBtn, (pairingCode.length !== 6 || pairing) && styles.connectBtnLoading]}
              onPress={handlePair}
              disabled={pairingCode.length !== 6 || pairing}
            >
              {pairing ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.connectBtnText}>페어링</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 연결 폼 */}
        {!connected && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={ip} onChangeText={setIp}
              placeholder="맥미니 IP (예: 192.168.219.101)" placeholderTextColor="#333"
              keyboardType="numbers-and-punctuation" autoCapitalize="none" />
            <TouchableOpacity style={[styles.connectBtn, connecting && styles.connectBtnLoading]}
              onPress={handleConnect} disabled={connecting || !ip.trim()} activeOpacity={0.85}>
              {connecting ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.connectBtnText}>VeryTerm 연결</Text>}
            </TouchableOpacity>
            <Text style={styles.hint}>맥미니에서 <Text style={styles.hintCode}>VeryTerm 앱</Text>을 켜주세요</Text>
          </View>
        )}

        {/* 프로젝트 목록 */}
        {connected && paired && projects.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>
            {visibleProjects.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.projectCard, selectedProject?.id === p.id && styles.projectCardActive]}
                onPress={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}
                activeOpacity={0.75}
              >
                <View style={styles.projectInfo}>
                  <View style={[styles.typeDot, { backgroundColor: typeColor[p.type] || "#555" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.projectName}>{p.name}</Text>
                    <Text style={styles.projectPath} numberOfLines={1}>{p.path}</Text>
                  </View>
                  <View style={styles.serverBadge}>
                    <View style={[styles.serverDot, { backgroundColor: p.serverRunning ? "#39FF14" : "#333" }]} />
                    <Text style={[styles.serverText, p.serverRunning && styles.serverTextOn]}>
                      {p.serverRunning ? "ON" : "OFF"}
                    </Text>
                  </View>
                </View>

                {/* 선택된 프로젝트 명령어 */}
                {selectedProject?.id === p.id && (
                  <View style={styles.cmdSection}>
                    {/* 서버 시작/중지 */}
                    <View style={styles.cmdRow}>
                      <TouchableOpacity
                        style={[styles.cmdBtn, p.serverRunning && styles.cmdBtnStop]}
                        onPress={() => toggleServer(p)}
                        disabled={vtLoading === p.id}
                      >
                        {vtLoading === p.id
                          ? <ActivityIndicator size="small" color={p.serverRunning ? "#fff" : "#000"} />
                          : p.serverRunning
                            ? <><Square size={13} color="#fff" /><Text style={[styles.cmdBtnText, { color: "#fff" }]}>서버 중지</Text></>
                            : <><Play size={13} color="#000" /><Text style={styles.cmdBtnText}>서버 시작</Text></>
                        }
                      </TouchableOpacity>
                    </View>

                    {/* 프로젝트 명령어 */}
                    <View style={styles.cmdRow}>
                      {(PROJECT_COMMANDS[p.type] || PROJECT_COMMANDS.node).map(({ label, cmd }) => (
                        <TouchableOpacity
                          key={label}
                          style={[styles.cmdBtnSmall, runningCmd === cmd && styles.cmdBtnSmallActive]}
                          onPress={() => runCommand(cmd, p)}
                          disabled={!!runningCmd}
                        >
                          <Terminal size={11} color={runningCmd === cmd ? "#39FF14" : "#888"} />
                          <Text style={[styles.cmdBtnSmallText, runningCmd === cmd && { color: "#39FF14" }]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {projects.length > 4 && (
              <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllProjects(!showAllProjects)}>
                {showAllProjects ? <ChevronUp size={14} color="#555" /> : <ChevronDown size={14} color="#555" />}
                <Text style={styles.showMoreText}>
                  {showAllProjects ? "접기" : `${projects.length - 4}개 더 보기`}
                </Text>
              </TouchableOpacity>
            )}

            {/* 새로고침 */}
            <TouchableOpacity style={styles.refreshBtn} onPress={async () => { await refreshProjects(); syncState(); }}>
              <RefreshCw size={14} color="#555" />
              <Text style={styles.refreshText}>새로고침</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 자유 명령어 입력 */}
        {connected && paired && (
          <View style={styles.freeCmdSection}>
            <Text style={styles.sectionTitle}>TERMINAL</Text>
            {selectedProject && (
              <Text style={styles.cwdLabel}>CWD: {selectedProject.path}</Text>
            )}
            <View style={styles.freeCmdRow}>
              <TextInput
                style={styles.freeCmdInput}
                value={freeCmd}
                onChangeText={setFreeCmd}
                placeholder={selectedProject ? `${selectedProject.name}에서 실행할 명령어...` : "명령어 입력..."}
                placeholderTextColor="#333"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={sendFreeCmd}
              />
              <TouchableOpacity
                style={[styles.freeCmdSend, (!freeCmd.trim() || !!runningCmd) && styles.freeCmdSendOff]}
                onPress={sendFreeCmd}
                disabled={!freeCmd.trim() || !!runningCmd}
              >
                {runningCmd ? <ActivityIndicator size="small" color="#39FF14" /> : <Send size={16} color={freeCmd.trim() ? "#000" : "#333"} />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 터미널 로그 */}
        {logs.length > 0 && (
          <View style={styles.logBox}>
            <View style={styles.logHeader}>
              <Terminal size={14} color="#39FF14" />
              <Text style={styles.logTitle}>출력</Text>
              <TouchableOpacity onPress={() => setLogs([])} style={styles.clearBtn}>
                <Text style={styles.clearText}>지우기</Text>
              </TouchableOpacity>
            </View>
            {logs.slice(-20).map((l, i) => (
              <View key={i} style={styles.logEntry}>
                <Text style={styles.logCmd}>$ {l.cmd}</Text>
                <Text style={styles.logOutput} selectable>{l.output}</Text>
              </View>
            ))}
          </View>
        )}

        {connected && paired && projects.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>VeryTerm에 프로젝트를 추가해주세요</Text>
          </View>
        )}

        </>)}

        {/* ====== 진행현황 탭 ====== */}
        {activeTab === "progress" && (<>
          <Text style={styles.sectionTitle}>프로젝트 진행현황</Text>

          {!connected || !paired ? (
            <View style={styles.progressEmpty}>
              <Activity size={28} color="#333" />
              <Text style={styles.progressEmptyText}>VeryTerm에 연결하면{"\n"}실시간 작업 현황을 볼 수 있어요</Text>
            </View>
          ) : progressEvents.length === 0 ? (
            <View style={styles.progressEmpty}>
              <Activity size={28} color="#333" />
              <Text style={styles.progressEmptyText}>아직 감지된 작업이 없어요{"\n"}터미널에서 빌드/커밋/배포를 실행해보세요</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setProgressEvents([])} style={styles.progressClearBtn}>
                <Text style={styles.progressClearBtnText}>기록 지우기</Text>
              </TouchableOpacity>
              {progressEvents.map((ev) => {
                const meta: Record<string, { emoji: string; color: string }> = {
                  build_success: { emoji: "✅", color: "#39FF14" },
                  build_fail:    { emoji: "❌", color: "#ff4444" },
                  test_pass:     { emoji: "🧪", color: "#39FF14" },
                  test_fail:     { emoji: "🧪", color: "#ff4444" },
                  commit:        { emoji: "📝", color: "#4fc3f7" },
                  server_start:  { emoji: "🚀", color: "#ff9900" },
                  deploy_success:{ emoji: "🎉", color: "#39FF14" },
                  error:         { emoji: "⚠️", color: "#ff4444" },
                  info:          { emoji: "ℹ️", color: "#888" },
                };
                const m = meta[ev.type] ?? { emoji: "ℹ️", color: "#555" };
                const time = new Date(ev.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                return (
                  <View key={`${ev.timestamp}-${ev.type}`} style={[styles.eventCard, { borderLeftColor: m.color }]}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventEmoji}>{m.emoji}</Text>
                      <Text style={[styles.eventProject, { color: m.color }]}>{ev.projectId}</Text>
                      <Text style={styles.eventTime}>{time}</Text>
                    </View>
                    <Text style={styles.eventMsg}>{ev.message}</Text>
                  </View>
                );
              })}
            </>
          )}
        </>)}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", flex: 1 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#39FF14" },
  // 탭
  tabRow: { flexDirection: "row", gap: 6 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, backgroundColor: "#0e0e0e", borderRadius: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  badge: { backgroundColor: "#39FF14", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: "center" },
  badgeText: { color: "#000", fontSize: 9, fontWeight: "900" },
  eventCard: { backgroundColor: "#0e0e0e", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#1a1a1a", borderLeftWidth: 3, gap: 6 },
  eventHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventEmoji: { fontSize: 16 },
  eventProject: { fontSize: 13, fontWeight: "800", flex: 1 },
  eventTime: { color: "#444", fontSize: 11 },
  eventMsg: { color: "#888", fontSize: 12, fontFamily: "monospace" },
  progressClearBtn: { alignSelf: "flex-end" as const, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#1a1a1a", borderRadius: 8 },
  progressClearBtnText: { color: "#555", fontSize: 12 },
  progressEmpty: { alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60, gap: 12 },
  progressEmptyText: { color: "#444", fontSize: 14, textAlign: "center" as const, lineHeight: 22 },
  tabBtnActive: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.06)" },
  tabBtnText: { color: "#555", fontSize: 14, fontWeight: "700" },
  tabBtnTextActive: { color: "#39FF14" },
  // ZeroClaw 정보 카드
  zcInfoCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(57,255,20,0.06)", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  zcInfoTitle: { color: "#39FF14", fontSize: 15, fontWeight: "800" },
  zcInfoDesc: { color: "#666", fontSize: 12, marginTop: 4, lineHeight: 18 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0e0e0e", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1a1a1a" },
  statusCardOn: { borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.04)" },
  statusCardWarn: { borderColor: "rgba(255,153,0,0.3)", backgroundColor: "rgba(255,153,0,0.04)" },
  statusText: { color: "#444", fontSize: 14, fontWeight: "600", flex: 1 },
  statusTextOn: { color: "#39FF14" },
  statusTextWarn: { color: "#ff9900" },
  // 페어링
  pairingCard: { backgroundColor: "#0e0e0e", borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: "rgba(255,153,0,0.3)", alignItems: "center" as const },
  pairingTitle: { color: "#fff", fontSize: 18, fontWeight: "800" as const },
  pairingDesc: { color: "#666", fontSize: 13, textAlign: "center" as const },
  pairingInput: { backgroundColor: "#111", borderWidth: 2, borderColor: "#ff9900", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, color: "#fff", fontSize: 28, fontWeight: "900" as const, letterSpacing: 8, width: 200, textAlign: "center" as const },
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
  // 프로젝트 카드
  projectCard: { backgroundColor: "#0e0e0e", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1a1a1a", gap: 10 },
  projectCardActive: { borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.04)" },
  projectInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  projectName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  projectPath: { color: "#333", fontSize: 11, fontFamily: "monospace" },
  serverBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  serverDot: { width: 6, height: 6, borderRadius: 3 },
  serverText: { color: "#333", fontSize: 10, fontWeight: "800" },
  serverTextOn: { color: "#39FF14" },
  // 명령어
  cmdSection: { gap: 8, paddingTop: 4 },
  cmdRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  cmdBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#39FF14", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cmdBtnStop: { backgroundColor: "#cc0000" },
  cmdBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },
  cmdBtnSmall: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#1a1a1a", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  cmdBtnSmallActive: { backgroundColor: "rgba(57,255,20,0.1)", borderWidth: 1, borderColor: "rgba(57,255,20,0.3)" },
  cmdBtnSmallText: { color: "#888", fontSize: 12, fontWeight: "700" },
  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  showMoreText: { color: "#555", fontSize: 12 },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, backgroundColor: "#0e0e0e", borderRadius: 12, borderWidth: 1, borderColor: "#1a1a1a" },
  refreshText: { color: "#555", fontSize: 13, fontWeight: "700" },
  // 자유 명령어
  freeCmdSection: { gap: 8 },
  cwdLabel: { color: "#333", fontSize: 11, fontFamily: "monospace" },
  freeCmdRow: { flexDirection: "row", gap: 8 },
  freeCmdInput: { flex: 1, backgroundColor: "#0e0e0e", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 14, fontFamily: "monospace" },
  freeCmdSend: { width: 44, height: 44, backgroundColor: "#39FF14", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  freeCmdSendOff: { backgroundColor: "#1a1a1a" },
  // 로그
  logBox: { backgroundColor: "#080808", borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: "#1a1a1a" },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  logTitle: { color: "#39FF14", fontSize: 12, fontWeight: "700", flex: 1 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#1a1a1a", borderRadius: 6 },
  clearText: { color: "#555", fontSize: 11 },
  logEntry: { gap: 4, borderLeftWidth: 2, borderLeftColor: "#1a1a1a", paddingLeft: 10, marginBottom: 6 },
  logCmd: { color: "#39FF14", fontSize: 11, fontFamily: "monospace" },
  logOutput: { color: "#888", fontSize: 12, fontFamily: "monospace", lineHeight: 18 },
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#333", fontSize: 14 },
});
