import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Mic, MicOff, Bot, User } from "lucide-react-native";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "안녕하세요! 저는 Claude입니다. 바이브코딩을 도와드릴게요. 무엇을 만들고 싶으신가요?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // TODO: Claude API 연결 (Phase 1-4)
      // 임시 응답
      await new Promise((r) => setTimeout(r, 1000));
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Claude API 키를 설정 탭에서 입력해주세요. 연결되면 실제 응답을 드릴게요! 🚀",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Bot size={16} color="#39FF14" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
        {isUser && (
          <View style={[styles.avatar, styles.avatarUser]}>
            <User size={16} color="#000" />
          </View>
        )}
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
            <Text style={styles.loadingText}>Claude가 생각 중...</Text>
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
            placeholder="메시지를 입력하거나 🎙️ 눌러 말하기"
            placeholderTextColor="#444"
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
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
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#1a1a1a", backgroundColor: "#080808" },
  micBtn: { width: 44, height: 44, backgroundColor: "rgba(57,255,20,0.08)", borderRadius: 22, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  micBtnActive: { backgroundColor: "#39FF14" },
  input: { flex: 1, backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#222", maxHeight: 120 },
  sendBtn: { width: 44, height: 44, backgroundColor: "#39FF14", borderRadius: 22, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#1a1a1a" },
});
