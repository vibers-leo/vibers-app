import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle, Monitor, Mic, Zap, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();

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
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>준비됨</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>말하면{"\n"}코딩된다.</Text>
          <Text style={styles.heroSub}>음성과 채팅으로 Claude와 대화하고{"\n"}PC 개발환경을 직접 제어하세요.</Text>
        </View>

        <TouchableOpacity style={styles.mainCard} onPress={() => router.push("/(tabs)/chat")} activeOpacity={0.85}>
          <View style={styles.mainCardIcon}>
            <MessageCircle size={28} color="#000" />
          </View>
          <View style={styles.mainCardText}>
            <Text style={styles.mainCardTitle}>새 채팅 시작</Text>
            <Text style={styles.mainCardSub}>Claude와 바이브코딩 시작</Text>
          </View>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.voiceCard} onPress={() => router.push("/(tabs)/chat")} activeOpacity={0.85}>
          <View style={styles.voiceCardIcon}>
            <Mic size={24} color="#39FF14" />
          </View>
          <View style={styles.voiceCardText}>
            <Text style={styles.voiceCardTitle}>음성으로 시작</Text>
            <Text style={styles.voiceCardSub}>말하면 Claude가 바로 응답</Text>
          </View>
          <ChevronRight size={18} color="#555" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.pcCard} onPress={() => router.push("/(tabs)/connect")} activeOpacity={0.85}>
          <View style={styles.pcCardIcon}>
            <Monitor size={24} color="#39FF14" />
          </View>
          <View style={styles.pcCardText}>
            <Text style={styles.pcCardTitle}>PC 연결</Text>
            <Text style={styles.pcCardSub}>ZeroClaw로 맥미니 제어</Text>
          </View>
          <ChevronRight size={18} color="#555" />
        </TouchableOpacity>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>핵심 기능</Text>
          {[
            { icon: "🎙️", title: "음성 입력", desc: "말하면 Claude가 코드로 번역" },
            { icon: "🔊", title: "영어 학습 모드", desc: "Claude가 영어로 답하고 읽어줌" },
            { icon: "💻", title: "PC 실제 제어", desc: "모바일에서 터미널 명령 실행" },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
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
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#39FF14" },
  statusText: { color: "#39FF14", fontSize: 11, fontWeight: "700" },
  hero: { marginBottom: 40 },
  heroTitle: { color: "#fff", fontSize: 52, fontWeight: "900", lineHeight: 56, letterSpacing: -2, marginBottom: 16 },
  heroSub: { color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 22, fontWeight: "500" },
  mainCard: { backgroundColor: "#39FF14", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 },
  mainCardIcon: { width: 48, height: 48, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 14, justifyContent: "center", alignItems: "center" },
  mainCardText: { flex: 1 },
  mainCardTitle: { color: "#000", fontSize: 17, fontWeight: "900" },
  mainCardSub: { color: "rgba(0,0,0,0.6)", fontSize: 13, fontWeight: "600", marginTop: 2 },
  voiceCard: { backgroundColor: "#111", borderWidth: 1, borderColor: "rgba(57,255,20,0.2)", borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  voiceCardIcon: { width: 42, height: 42, backgroundColor: "rgba(57,255,20,0.1)", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  voiceCardText: { flex: 1 },
  voiceCardTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  voiceCardSub: { color: "#555", fontSize: 12, fontWeight: "500", marginTop: 2 },
  pcCard: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 32 },
  pcCardIcon: { width: 42, height: 42, backgroundColor: "rgba(57,255,20,0.08)", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  pcCardText: { flex: 1 },
  pcCardTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  pcCardSub: { color: "#555", fontSize: 12, fontWeight: "500", marginTop: 2 },
  features: { backgroundColor: "#0e0e0e", borderRadius: 20, padding: 20, gap: 16 },
  featuresTitle: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 1, marginBottom: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: { fontSize: 24, width: 32 },
  featureTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  featureDesc: { color: "#555", fontSize: 12, fontWeight: "500", marginTop: 2 },
});
