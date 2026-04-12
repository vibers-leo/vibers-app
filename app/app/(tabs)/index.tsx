import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { MessageCircle, Monitor, Mic, Zap, ChevronRight, Trash2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isZCConnected } from "../../services/zeroclaw-client";
import { loadSessionList, deleteSession } from "../../services/chat-storage";

export default function HomeScreen() {
  const router = useRouter();
  const [recentChats, setRecentChats] = useState<{ id: string; title: string; updatedAt: number }[]>([]);
  const [zcConnected, setZcConnected] = useState(false);

  useFocusEffect(useCallback(() => {
    loadSessionList().then((list) => setRecentChats(list.slice(0, 5)));
    setZcConnected(isZCConnected());
  }, []));

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setRecentChats((prev) => prev.filter((c) => c.id !== id));
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Zap size={16} color="#000" fill="#000" />
            </View>
            <Text style={styles.logoText}>바이버스챗</Text>
          </View>
          <View style={[styles.statusBadge, zcConnected && styles.statusBadgeZC]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{zcConnected ? "ZeroClaw" : "준비됨"}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>말하면{"\n"}코딩된다.</Text>
          <Text style={styles.heroSub}>음성과 채팅으로 AI와 대화하고{"\n"}PC 개발환경을 직접 제어하세요.</Text>
        </View>

        <TouchableOpacity style={styles.mainCard} onPress={() => router.push("/(tabs)/chat")} activeOpacity={0.85}>
          <View style={styles.mainCardIcon}>
            <MessageCircle size={28} color="#000" />
          </View>
          <View style={styles.mainCardText}>
            <Text style={styles.mainCardTitle}>새 채팅 시작</Text>
            <Text style={styles.mainCardSub}>{zcConnected ? "ZeroClaw AI와 대화" : "AI와 바이브코딩 시작"}</Text>
          </View>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/chat")} activeOpacity={0.85}>
            <Mic size={20} color="#39FF14" />
            <Text style={styles.quickTitle}>음성 입력</Text>
            <Text style={styles.quickSub}>무료 · 오프라인</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/connect")} activeOpacity={0.85}>
            <Monitor size={20} color="#39FF14" />
            <Text style={styles.quickTitle}>PC 연결</Text>
            <Text style={styles.quickSub}>{zcConnected ? "연결됨" : "ZeroClaw"}</Text>
          </TouchableOpacity>
        </View>

        {/* 최근 대화 */}
        {recentChats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>최근 대화</Text>
            {recentChats.map((chat) => (
              <View key={chat.id} style={styles.chatRow}>
                <TouchableOpacity style={styles.chatInfo} onPress={() => router.push("/(tabs)/chat")} activeOpacity={0.75}>
                  <Text style={styles.chatTitle} numberOfLines={1}>{chat.title}</Text>
                  <Text style={styles.chatTime}>{timeAgo(chat.updatedAt)}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(chat.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Trash2 size={14} color="#333" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 시작 가이드 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시작 가이드</Text>
          {[
            { step: "1", title: "무료 API 키 발급", desc: "aistudio.google.com → Gemini 키 무료 발급", done: false },
            { step: "2", title: "설정에서 키 입력", desc: "설정 탭 → API 키 붙여넣기 → 저장", done: false },
            { step: "3", title: "채팅 시작!", desc: "마이크로 말하거나 텍스트로 입력", done: false },
            { step: "⚡", title: "PC 연결 (선택)", desc: "ZeroClaw로 PC에서 AI 실행 → 키 불필요", done: false },
          ].map((g, i) => (
            <View key={i} style={styles.guideRow}>
              <View style={styles.guideStep}>
                <Text style={styles.guideStepText}>{g.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guideTitle}>{g.title}</Text>
                <Text style={styles.guideDesc}>{g.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 무료 스택 안내 */}
        <View style={[styles.section, styles.freeSection]}>
          <Text style={styles.freeSectionTitle}>💰 완전 무료로 사용 가능</Text>
          <Text style={styles.freeSectionDesc}>
            STT: 디바이스 내장 (무료){"\n"}
            TTS: Edge TTS (무료){"\n"}
            AI: Gemini / Groq (무료 키){"\n"}
            ZeroClaw: 오픈소스 (무료)
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 40 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBadge: { width: 32, height: 32, backgroundColor: "#39FF14", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(57,255,20,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(57,255,20,0.2)" },
  statusBadgeZC: { backgroundColor: "rgba(57,255,20,0.15)", borderColor: "rgba(57,255,20,0.4)" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#39FF14" },
  statusText: { color: "#39FF14", fontSize: 11, fontWeight: "700" },
  hero: { marginBottom: 32 },
  heroTitle: { color: "#fff", fontSize: 48, fontWeight: "900", lineHeight: 52, letterSpacing: -2, marginBottom: 16 },
  heroSub: { color: "rgba(255,255,255,0.4)", fontSize: 15, lineHeight: 22, fontWeight: "500" },
  mainCard: { backgroundColor: "#39FF14", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 },
  mainCardIcon: { width: 48, height: 48, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 14, justifyContent: "center", alignItems: "center" },
  mainCardText: { flex: 1 },
  mainCardTitle: { color: "#000", fontSize: 17, fontWeight: "900" },
  mainCardSub: { color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: "600", marginTop: 2 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickCard: { flex: 1, backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 16, padding: 16, alignItems: "center", gap: 6 },
  quickTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  quickSub: { color: "#444", fontSize: 10, fontWeight: "600" },
  section: { backgroundColor: "#0e0e0e", borderRadius: 20, padding: 20, gap: 12, marginBottom: 12 },
  sectionTitle: { color: "#39FF14", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  chatInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  chatTitle: { color: "#ccc", fontSize: 13, fontWeight: "600", flex: 1 },
  chatTime: { color: "#444", fontSize: 10 },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  guideStep: { width: 28, height: 28, backgroundColor: "rgba(57,255,20,0.1)", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  guideStepText: { color: "#39FF14", fontSize: 12, fontWeight: "900" },
  guideTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  guideDesc: { color: "#555", fontSize: 11, marginTop: 2 },
  freeSection: { borderWidth: 1, borderColor: "rgba(57,255,20,0.15)", backgroundColor: "rgba(57,255,20,0.03)" },
  freeSectionTitle: { color: "#39FF14", fontSize: 14, fontWeight: "800" },
  freeSectionDesc: { color: "#666", fontSize: 12, lineHeight: 20 },
});
