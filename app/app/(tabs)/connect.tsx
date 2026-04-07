import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Monitor, Wifi, WifiOff, ChevronRight, Info } from "lucide-react-native";

export default function ConnectScreen() {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("42617");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!ip.trim()) return;
    setConnecting(true);
    // TODO: ZeroClaw /pair API 호출 (Phase 3)
    await new Promise((r) => setTimeout(r, 1500));
    setConnecting(false);
    setConnected(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Monitor size={32} color="#39FF14" />
          <Text style={styles.title}>PC 연결</Text>
          <Text style={styles.subtitle}>ZeroClaw gateway를 통해{"\n"}맥미니와 연결합니다</Text>
        </View>

        {/* 연결 상태 */}
        <View style={[styles.statusCard, connected && styles.statusCardConnected]}>
          {connected ? <Wifi size={20} color="#39FF14" /> : <WifiOff size={20} color="#555" />}
          <Text style={[styles.statusText, connected && styles.statusTextConnected]}>
            {connected ? "연결됨" : "연결 안 됨"}
          </Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Text style={styles.label}>PC IP 주소</Text>
          <TextInput
            style={styles.input}
            value={ip}
            onChangeText={setIp}
            placeholder="예: 192.168.1.100"
            placeholderTextColor="#444"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />

          <Text style={styles.label}>포트</Text>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="42617"
            placeholderTextColor="#444"
            keyboardType="number-pad"
          />
        </View>

        {/* 연결 버튼 */}
        <TouchableOpacity
          style={[styles.connectBtn, connecting && styles.connectBtnLoading]}
          onPress={handleConnect}
          disabled={connecting || !ip.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.connectBtnText}>
            {connecting ? "연결 중..." : connected ? "재연결" : "연결하기"}
          </Text>
        </TouchableOpacity>

        {/* 안내 */}
        <View style={styles.guide}>
          <View style={styles.guideRow}>
            <Info size={14} color="#39FF14" />
            <Text style={styles.guideTitle}>PC 설정 방법</Text>
          </View>
          {[
            "맥미니 터미널에서 zeroclaw gateway 실행",
            "같은 Wi-Fi 네트워크에 연결",
            "맥미니 IP 주소 입력 후 연결",
          ].map((step, i) => (
            <Text key={i} style={styles.guideStep}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scroll: { padding: 24, gap: 20 },
  header: { alignItems: "center", gap: 12, marginBottom: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#555", fontSize: 14, textAlign: "center", lineHeight: 20 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#111", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#222" },
  statusCardConnected: { borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.05)" },
  statusText: { color: "#555", fontSize: 15, fontWeight: "700" },
  statusTextConnected: { color: "#39FF14" },
  form: { gap: 12 },
  label: { color: "#888", fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  input: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 15 },
  connectBtn: { backgroundColor: "#39FF14", borderRadius: 16, padding: 18, alignItems: "center" },
  connectBtnLoading: { backgroundColor: "rgba(57,255,20,0.4)" },
  connectBtnText: { color: "#000", fontSize: 16, fontWeight: "900" },
  guide: { backgroundColor: "#0e0e0e", borderRadius: 16, padding: 18, gap: 10 },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  guideTitle: { color: "#39FF14", fontSize: 13, fontWeight: "800" },
  guideStep: { color: "#555", fontSize: 13, lineHeight: 20 },
});
