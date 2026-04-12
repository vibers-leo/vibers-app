import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Send, Bot, User, Volume2, VolumeX, Monitor, Zap } from "lucide-react-native";
import { sendMessageStream, loadSettings, getKeyForProvider, type Provider } from "../../services/ai-client";
import { getSharedClient, isConnected as vtIsConnected, projectsToPromptContext } from "../../services/veryterm-client";
import { getZCClient, isZCConnected, isZCWsOpen, autoConnectZC, type ZeroClawMessage } from "../../services/zeroclaw-client";
import { startRecording, stopRecording, setupSpeechEvents, setPartialCallback } from "../../services/stt";
import { speak, stopSpeaking } from "../../services/tts";
import Markdown from "react-native-markdown-display";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_KO = "당신은 바이브코딩 전문 AI 어시스턴트입니다. 코딩 질문에 친절하고 실용적으로 답변해주세요.";
const SYSTEM_EN = "You are an expert vibe coding assistant. Answer in English only. Be concise and practical.";

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState("gemini-2.0-flash-lite");
  const [apiKey, setApiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [englishMode, setEnglishMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [noKey, setNoKey] = useState(false);
  const [sttError, setSttError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [ttsVoice, setTtsVoice] = useState("ko-female");
  const [aiMode, setAiMode] = useState<"local" | "zeroclaw">("local");
  const micScale = useRef(new Animated.Value(1)).current;
  const micPulse = useRef(new Animated.Value(1)).current;
  const listRef = useRef<FlatList>(null);

  const reloadSettings = useCallback(() => {
    loadSettings().then((s) => {
      console.log("[chat] reloadSettings:", s.provider, s.model, "keys:", {
        claude: s.claudeKey ? "✓" : "✗",
        gemini: s.geminiKey ? "✓" : "✗",
        groq: s.groqKey ? "✓" : "✗",
        openai: s.openaiKey ? "✓" : "✗",
      });
      setProvider(s.provider);
      setModel(s.model);
      setEnglishMode(s.englishMode);
      setTtsEnabled(s.ttsEnabled);
      setOpenaiKey(s.openaiKey);
      setCustomPrompt(s.systemPrompt);
      setTtsVoice(s.ttsVoice);
      const key = getKeyForProvider(s.provider, s);
      console.log("[chat] apiKey for", s.provider, ":", key ? "있음(" + key.slice(0, 6) + "...)" : "없음");
      setApiKey(key);
    });
  }, []);

  useEffect(() => {
    loadSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
      setEnglishMode(s.englishMode);
      setTtsEnabled(s.ttsEnabled);
      setOpenaiKey(s.openaiKey);
      setCustomPrompt(s.systemPrompt);
      setTtsVoice(s.ttsVoice);
      const key = getKeyForProvider(s.provider, s);
      setApiKey(key);
      const greeting = s.englishMode
        ? "Hi! Tap the mic to speak, or type below."
        : "안녕하세요! 🎤 마이크를 탭해서 말하거나 ⌨️ 텍스트로 입력하세요.";
      setMessages([{ id: "0", role: "assistant", content: greeting }]);
    });
  }, []);

  useFocusEffect(reloadSettings);

  // ZeroClaw 자동 연결 + 모드 감지
  useEffect(() => {
    autoConnectZC().then((ok) => {
      if (ok) setAiMode("zeroclaw");
    });
  }, []);

  useFocusEffect(useCallback(() => {
    setAiMode(isZCConnected() && isZCWsOpen() ? "zeroclaw" : "local");
  }, []));

  // 음성인식 이벤트 리스너
  useEffect(() => {
    const cleanup = setupSpeechEvents();
    return cleanup;
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      micPulse.stopAnimation();
      micPulse.setValue(1);
    }
  }, [isRecording]);

  const onMicPress = async () => {
    Animated.sequence([
      Animated.spring(micScale, { toValue: 0.88, useNativeDriver: true }),
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);
      try {
        const text = await stopRecording();
        if (text.trim()) {
          setInput(text);
          setShowInput(true);
          await submitMessage(text);
        }
      } catch (e: any) {
        setSttError(e.message);
        setTimeout(() => setSttError(""), 3000);
        setShowInput(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        await startRecording(englishMode ? "en-US" : "ko-KR");
        setIsRecording(true);
        setShowInput(false);
      } catch {
        setShowInput((v) => !v);
      }
    }
  };

  const submitMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isLoading) return;
    if (aiMode === "local" && !apiKey) {
      setNoKey(true);
      setTimeout(() => setNoKey(false), 3000);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    setMessages((prev) => {
      const history = [...prev, userMsg];
      sendAI(history);
      return history;
    });
    setInput("");
    setShowInput(false);
  };

  const sendAI = async (history: Message[]) => {
    setIsLoading(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      if (aiMode === "zeroclaw" && isZCWsOpen()) {
        await sendViaZeroClaw(history, assistantId);
      } else {
        await sendViaLocal(history, assistantId);
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `오류: ${e.message}` } : m)
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ── ZeroClaw 모드: WebSocket으로 대화 ──
  const sendViaZeroClaw = (history: Message[], assistantId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const client = getZCClient();
      if (!client) { reject(new Error("ZeroClaw 미연결")); return; }

      const userMsg = history[history.length - 1];

      // 이벤트 핸들러 등록
      const unsubs: (() => void)[] = [];

      unsubs.push(client.on("chunk", (msg) => {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + (msg.content || "") } : m)
        );
      }));

      unsubs.push(client.on("thinking", (msg) => {
        // thinking은 별도 표시 (선택적)
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + `\n> 💭 ${msg.content}\n` } : m)
        );
      }));

      unsubs.push(client.on("tool_call", (msg) => {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? {
            ...m, content: m.content + `\n⚡ **${msg.name}** 실행 중...\n`
          } : m)
        );
      }));

      unsubs.push(client.on("tool_result", (msg) => {
        const output = (msg.output || "").length > 1500
          ? (msg.output || "").slice(0, 1500) + "\n...(생략)"
          : msg.output || "(출력 없음)";
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? {
            ...m, content: m.content + `\`\`\`\n${output}\n\`\`\`\n`
          } : m)
        );
      }));

      unsubs.push(client.on("done", (msg) => {
        unsubs.forEach((u) => u());
        // TTS
        if (ttsEnabled) {
          const fullText = msg.full_response || "";
          if (fullText) {
            setIsSpeaking(true);
            speak(fullText, englishMode, ttsVoice as any).then(() => setIsSpeaking(false));
          }
        }
        resolve();
      }));

      unsubs.push(client.on("error", (msg) => {
        unsubs.forEach((u) => u());
        reject(new Error(msg.message || "ZeroClaw 오류"));
      }));

      // 메시지 전송
      try {
        client.sendMessage(userMsg.content);
      } catch (e) {
        unsubs.forEach((u) => u());
        reject(e);
      }
    });
  };

  // ── 로컬 모드: 기존 직접 API 호출 ──
  const sendViaLocal = async (history: Message[], assistantId: string) => {
    const apiHistory = history
      .filter((m) => m.id !== "0")
      .map((m) => ({ role: m.role, content: m.content }));

    let systemPrompt = customPrompt || (englishMode ? SYSTEM_EN : SYSTEM_KO);
    const vtContext = projectsToPromptContext();
    if (vtContext) systemPrompt += vtContext;

    await sendMessageStream(
      apiHistory, provider, model, apiKey, systemPrompt,
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      }
    );

    const finalContent = await new Promise<string>((resolve) => {
      setMessages((prev) => {
        resolve(prev.find((m) => m.id === assistantId)?.content || "");
        return prev;
      });
    });

    const vtCmd = parseVeryTermCommand(finalContent);
    if (vtCmd && vtIsConnected()) {
      await executeVeryTermCommand(vtCmd, assistantId, apiHistory, finalContent);
    } else if (ttsEnabled && finalContent) {
      setIsSpeaking(true);
      speak(finalContent, englishMode, ttsVoice as any).then(() => setIsSpeaking(false));
    }
  };

  /** AI 응답에서 ```veryterm JSON 블록 파싱 */
  const parseVeryTermCommand = (text: string): { command: string; cwd?: string } | null => {
    const match = text.match(/```veryterm\s*\n?\s*(\{[\s\S]*?\})\s*\n?```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.command) return { command: parsed.command, cwd: parsed.cwd };
    } catch {}
    return null;
  };

  /** VeryTerm 명령 실행 → 결과를 채팅에 표시 → AI에게 피드백 */
  const executeVeryTermCommand = async (
    cmd: { command: string; cwd?: string },
    assistantId: string,
    apiHistory: { role: string; content: string }[],
    aiResponse: string
  ) => {
    const client = getSharedClient();
    if (!client) return;

    // 실행 중 표시
    const execId = (Date.now() + 2).toString();
    setMessages((prev) => [...prev, {
      id: execId, role: "assistant" as const,
      content: `⚡ 실행 중: \`${cmd.command}\`${cmd.cwd ? `\n📂 ${cmd.cwd}` : ""}`,
    }]);

    try {
      const output = await client.run(cmd.command, cmd.cwd);
      const trimmedOutput = output.length > 2000 ? output.slice(0, 2000) + "\n...(생략)" : output;

      // 실행 결과 표시
      setMessages((prev) =>
        prev.map((m) => m.id === execId ? {
          ...m,
          content: `⚡ \`${cmd.command}\`\n\`\`\`\n${trimmedOutput || "(출력 없음)"}\n\`\`\``,
        } : m)
      );

      // AI에게 결과 피드백 → 분석 요청
      const feedbackHistory = [
        ...apiHistory,
        { role: "assistant" as const, content: aiResponse },
        { role: "user" as const, content: `[VeryTerm 실행 결과]\n명령: ${cmd.command}\n출력:\n${trimmedOutput}\n\n이 결과를 간단히 분석해주세요.` },
      ];

      const analysisId = (Date.now() + 3).toString();
      setMessages((prev) => [...prev, { id: analysisId, role: "assistant" as const, content: "" }]);

      let analysisPrompt = customPrompt || (englishMode ? SYSTEM_EN : SYSTEM_KO);
      const vtCtx = projectsToPromptContext();
      if (vtCtx) analysisPrompt += vtCtx;

      await sendMessageStream(
        feedbackHistory as any,
        provider, model, apiKey, analysisPrompt,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => m.id === analysisId ? { ...m, content: m.content + chunk } : m)
          );
        }
      );

      // 분석 결과 TTS
      if (ttsEnabled) {
        const analysisContent = await new Promise<string>((resolve) => {
          setMessages((prev) => {
            resolve(prev.find((m) => m.id === analysisId)?.content || "");
            return prev;
          });
        });
        if (analysisContent) {
          setIsSpeaking(true);
          speak(analysisContent, englishMode, ttsVoice as any).then(() => setIsSpeaking(false));
        }
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === execId ? { ...m, content: `⚡ 실행 오류: ${e.message}` } : m)
      );
    }
  };

  const onSend = () => submitMessage(input);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    if (!isUser && item.id !== "0" && !item.content) return null;
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && <View style={styles.avatar}><Bot size={16} color="#39FF14" /></View>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {isUser ? (
            <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.content}</Text>
          ) : (
            <Markdown style={mdStyles}>{item.content}</Markdown>
          )}
        </View>
        {isUser && <View style={[styles.avatar, styles.avatarUser]}><User size={16} color="#000" /></View>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>

        {/* 상단 상태 바 */}
        <View style={styles.topBar}>
          {aiMode === "zeroclaw" ? (
            <View style={styles.zcBadge}>
              <Zap size={12} color="#39FF14" />
              <Text style={styles.zcBadgeText}>ZeroClaw</Text>
            </View>
          ) : (
            <Text style={styles.modelBadge}>{model.split("-").slice(0, 2).join(" ")}</Text>
          )}
          {vtIsConnected() && aiMode === "local" && (
            <View style={styles.vtBadge}>
              <Monitor size={10} color="#39FF14" />
              <Text style={styles.vtBadgeText}>PC</Text>
            </View>
          )}
          {isSpeaking && (
            <TouchableOpacity onPress={() => { stopSpeaking(); setIsSpeaking(false); }} style={styles.speakingBtn}>
              <VolumeX size={14} color="#39FF14" />
              <Text style={styles.speakingText}>중지</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* 상태 배너들 */}
        {isLoading && !isRecording && (
          <View style={styles.banner}>
            <ActivityIndicator size="small" color="#39FF14" />
            <Text style={styles.bannerText}>AI가 생각 중...</Text>
          </View>
        )}
        {isRecording && (
          <View style={[styles.banner, styles.bannerRecording]}>
            <Animated.View style={[styles.recDot, { transform: [{ scale: micPulse }] }]} />
            <Text style={styles.bannerText}>녹음 중... 탭해서 완료</Text>
          </View>
        )}
        {noKey && (
          <View style={[styles.banner, styles.bannerWarn]}>
            <Text style={styles.bannerText}>⚙️ 설정에서 API 키를 입력해주세요</Text>
          </View>
        )}
        {sttError !== "" && (
          <View style={[styles.banner, styles.bannerWarn]}>
            <Text style={styles.bannerText}>STT 오류: {sttError}</Text>
          </View>
        )}

        {/* 입력 미리보기 */}
        {showInput && input.length > 0 && (
          <View style={styles.previewBar}>
            <Text style={styles.previewText} numberOfLines={2}>{input}</Text>
          </View>
        )}

        {/* 텍스트 입력 */}
        {showInput && (
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder={englishMode ? "Type your message..." : "메시지 입력..."}
              placeholderTextColor="#444"
              multiline
              maxLength={2000}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnOff]}
              onPress={onSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} color={input.trim() && !isLoading ? "#000" : "#333"} />
            </TouchableOpacity>
          </View>
        )}

        {/* 메인 마이크 버튼 */}
        <View style={styles.micArea}>
          <Animated.View style={{ transform: [{ scale: micScale }] }}>
            <Animated.View style={{ transform: [{ scale: micPulse }] }}>
              <TouchableOpacity
                style={[styles.micBtn, isRecording && styles.micBtnRecording]}
                onPress={onMicPress}
                activeOpacity={0.8}
              >
                <Text style={styles.micIcon}>{isRecording ? "⏹️" : showInput ? "⌨️" : "🎤"}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
          <Text style={styles.micHint}>
            {isRecording ? "탭해서 전송" : showInput ? "탭해서 음성 입력" : "탭해서 말하기"}
          </Text>
          {!showInput && !isRecording && (
            <TouchableOpacity onPress={() => setShowInput(true)} style={styles.typeToggle}>
              <Text style={styles.typeToggleText}>⌨️ 직접 입력</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#0e0e0e" },
  modelBadge: { color: "#333", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  zcBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(57,255,20,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  zcBadgeText: { color: "#39FF14", fontSize: 11, fontWeight: "800" },
  vtBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(57,255,20,0.1)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  vtBadgeText: { color: "#39FF14", fontSize: 9, fontWeight: "800" },
  speakingBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(57,255,20,0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  speakingText: { color: "#39FF14", fontSize: 11, fontWeight: "700" },
  list: { padding: 16, gap: 12, paddingBottom: 8 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  messageRowUser: { justifyContent: "flex-end" },
  avatar: { width: 28, height: 28, backgroundColor: "rgba(57,255,20,0.1)", borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  avatarUser: { backgroundColor: "#39FF14" },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleAssistant: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222" },
  bubbleUser: { backgroundColor: "#39FF14" },
  bubbleText: { color: "#ddd", fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: "#000", fontWeight: "600" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#0a0a0a" },
  bannerRecording: { backgroundColor: "rgba(255,50,50,0.08)" },
  bannerWarn: { backgroundColor: "rgba(57,255,20,0.05)", borderTopWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  bannerText: { color: "#39FF14", fontSize: 13, fontWeight: "600" },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff3232" },
  previewBar: { marginHorizontal: 16, marginBottom: 4, backgroundColor: "#0d1a0d", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  previewText: { color: "rgba(57,255,20,0.7)", fontSize: 14, lineHeight: 20 },
  textInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  textInput: { flex: 1, backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#39FF14", maxHeight: 120 },
  sendBtn: { width: 44, height: 44, backgroundColor: "#39FF14", borderRadius: 22, justifyContent: "center", alignItems: "center" },
  sendBtnOff: { backgroundColor: "#1a1a1a" },
  micArea: { alignItems: "center", paddingVertical: 20, gap: 8 },
  micBtn: { width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(57,255,20,0.08)", borderWidth: 2, borderColor: "rgba(57,255,20,0.3)", justifyContent: "center", alignItems: "center" },
  micBtnRecording: { backgroundColor: "rgba(255,50,50,0.15)", borderColor: "#ff3232" },
  micIcon: { fontSize: 38 },
  micHint: { color: "#333", fontSize: 12 },
  typeToggle: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#0e0e0e", borderRadius: 10 },
  typeToggleText: { color: "#555", fontSize: 13 },
});

const mdStyles = StyleSheet.create({
  body: { color: "#ddd", fontSize: 15, lineHeight: 22 },
  heading1: { color: "#fff", fontSize: 20, fontWeight: "800", marginVertical: 6 },
  heading2: { color: "#fff", fontSize: 17, fontWeight: "700", marginVertical: 4 },
  heading3: { color: "#eee", fontSize: 15, fontWeight: "700", marginVertical: 4 },
  strong: { color: "#fff", fontWeight: "700" },
  em: { color: "#ccc", fontStyle: "italic" },
  link: { color: "#39FF14" },
  blockquote: { backgroundColor: "rgba(57,255,20,0.05)", borderLeftColor: "#39FF14", borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginVertical: 4 },
  code_inline: { backgroundColor: "#1a1a1a", color: "#39FF14", fontSize: 13, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  code_block: { backgroundColor: "#0a0a0a", color: "#39FF14", fontSize: 13, padding: 12, borderRadius: 8, marginVertical: 6 },
  fence: { backgroundColor: "#0a0a0a", color: "#39FF14", fontSize: 13, padding: 12, borderRadius: 8, marginVertical: 6 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  paragraph: { marginVertical: 2 },
  hr: { backgroundColor: "#222", height: 1, marginVertical: 8 },
});
