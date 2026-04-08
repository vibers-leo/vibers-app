import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Animated } from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Send, Bot, User, Volume2, VolumeX } from "lucide-react-native";
import { sendMessage, loadSettings, type Provider } from "../../services/ai-client";
import { startRecording, stopRecording } from "../../services/stt";
import { speak, stopSpeaking } from "../../services/tts";

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
  const micScale = useRef(new Animated.Value(1)).current;
  const micPulse = useRef(new Animated.Value(1)).current;
  const listRef = useRef<FlatList>(null);

  const reloadSettings = useCallback(() => {
    loadSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
      setEnglishMode(s.englishMode);
      setTtsEnabled(s.ttsEnabled);
      setOpenaiKey(s.openaiKey);
      const key = s.provider === "claude" ? s.claudeKey : s.provider === "gemini" ? s.geminiKey : s.groqKey;
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
      const key = s.provider === "claude" ? s.claudeKey : s.provider === "gemini" ? s.geminiKey : s.groqKey;
      setApiKey(key);
      const greeting = s.englishMode
        ? "Hi! Tap the mic to speak, or type below."
        : "안녕하세요! 🎤 마이크를 탭해서 말하거나 ⌨️ 텍스트로 입력하세요.";
      setMessages([{ id: "0", role: "assistant", content: greeting }]);
    });
  }, []);

  useFocusEffect(reloadSettings);

  // 녹음 중 맥동 애니메이션
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
      // 녹음 종료 → STT
      setIsRecording(false);
      if (!openaiKey) {
        setShowInput(true);
        return;
      }
      setIsLoading(true);
      try {
        const text = await stopRecording(openaiKey);
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
      // 녹음 시작
      if (openaiKey) {
        try {
          await startRecording();
          setIsRecording(true);
          setShowInput(false);
        } catch {
          setShowInput(true);
        }
      } else {
        setShowInput((v) => !v);
      }
    }
  };

  const submitMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isLoading) return;
    if (!apiKey) {
      setNoKey(true);
      setTimeout(() => setNoKey(false), 3000);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    setMessages((prev) => {
      const history = [...prev, userMsg];
      sendAI(history, userMsg);
      return history;
    });
    setInput("");
    setShowInput(false);
  };

  const sendAI = async (history: Message[], userMsg: Message) => {
    setIsLoading(true);
    const apiHistory = history
      .filter((m) => m.id !== "0")
      .map((m) => ({ role: m.role, content: m.content }));
    try {
      const reply = await sendMessage(apiHistory, provider, model, apiKey, englishMode ? SYSTEM_EN : SYSTEM_KO);
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: reply };
      setMessages((prev) => [...prev, assistantMsg]);
      if (ttsEnabled) {
        setIsSpeaking(true);
        await speak(reply, englishMode);
        setIsSpeaking(false);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `오류: ${e.message}` }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const onSend = () => submitMessage(input);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && <View style={styles.avatar}><Bot size={16} color="#39FF14" /></View>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
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
          <Text style={styles.modelBadge}>{model.split("-").slice(0, 2).join(" ")}</Text>
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
            {isRecording ? "탭해서 전송" : showInput ? "탭해서 음성 입력" : openaiKey ? "탭해서 말하기" : "탭해서 텍스트 입력"}
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
