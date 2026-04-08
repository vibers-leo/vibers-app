import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Mic, MicOff, Bot, User } from "lucide-react-native";
import { sendMessage, loadSettings, type Provider } from "../../services/ai-client";

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
  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [apiKey, setApiKey] = useState("");
  const [englishMode, setEnglishMode] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
      setEnglishMode(s.englishMode);
      const key = s.provider === "claude" ? s.claudeKey : s.provider === "gemini" ? s.geminiKey : s.groqKey;
      setApiKey(key);
      const greeting = s.englishMode
        ? "Hi! I'm your vibe coding assistant. What would you like to build?"
        : "안녕하세요! 바이브코딩 AI입니다. 무엇을 만들고 싶으신가요?";
      setMessages([{ id: "0", role: "assistant", content: greeting }]);
    });
  }, []);

  const sendMsg = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setNoKey(true);
      setTimeout(() => setNoKey(false), 3000);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    const history = [...messages, userMsg].filter((m) => m.id !== "0").map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const reply = await sendMessage(history, provider, model, apiKey, englishMode ? SYSTEM_EN : SYSTEM_KO);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `오류: ${e.message}` }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#39FF14" />
            <Text style={styles.loadingText}>AI가 생각 중...</Text>
          </View>
        )}

        {noKey && (
          <View style={styles.noKeyBanner}>
            <Text style={styles.noKeyText}>⚙️ 설정 탭에서 API 키를 입력해주세요</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            onPress={() => setIsRecording((v) => !v)}
          >
            {isRecording ? <MicOff size={20} color="#000" /> : <Mic size={20} color="#39FF14" />}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={englishMode ? "Type or 🎙️ speak..." : "메시지 입력 또는 🎙️ 눌러 말하기"}
            placeholderTextColor="#444"
            multiline
            maxLength={2000}
            onSubmitEditing={sendMsg}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={sendMsg}
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} color={input.trim() && !isLoading ? "#000" : "#333"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  list: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  messageRowUser: { justifyContent: "flex-end" },
  avatar: { width: 28, height: 28, backgroundColor: "rgba(57,255,20,0.1)", borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  avatarUser: { backgroundColor: "#39FF14" },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleAssistant: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222" },
  bubbleUser: { backgroundColor: "#39FF14" },
  bubbleText: { color: "#ddd", fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: "#000", fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  loadingText: { color: "#39FF14", fontSize: 13, fontWeight: "600" },
  noKeyBanner: { backgroundColor: "#1a0a00", borderTopWidth: 1, borderColor: "#39FF14", paddingHorizontal: 20, paddingVertical: 10 },
  noKeyText: { color: "#39FF14", fontSize: 13, textAlign: "center" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#1a1a1a", backgroundColor: "#080808" },
  micBtn: { width: 44, height: 44, backgroundColor: "rgba(57,255,20,0.08)", borderRadius: 22, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  micBtnActive: { backgroundColor: "#39FF14" },
  input: { flex: 1, backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#222", maxHeight: 120 },
  sendBtn: { width: 44, height: 44, backgroundColor: "#39FF14", borderRadius: 22, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#1a1a1a" },
});
