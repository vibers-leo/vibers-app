import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Key, Volume2, Globe, ChevronRight } from "lucide-react-native";

export default function SettingsScreen() {
  const [claudeKey, setClaudeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [englishMode, setEnglishMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>설정</Text>

        {/* API 키 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API 키</Text>

          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Key size={16} color="#39FF14" />
              <Text style={styles.fieldLabel}>Claude API Key</Text>
            </View>
            <TextInput
              style={styles.input}
              value={claudeKey}
              onChangeText={setClaudeKey}
              placeholder="sk-ant-..."
              placeholderTextColor="#444"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.fieldHint}>채팅 기능에 필요합니다</Text>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Key size={16} color="#888" />
              <Text style={styles.fieldLabel}>OpenAI API Key (Whisper STT)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={openaiKey}
              onChangeText={setOpenaiKey}
              placeholder="sk-..."
              placeholderTextColor="#444"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.fieldHint}>음성 입력 기능에 필요합니다</Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>

        {/* 음성 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>음성 설정</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Volume2 size={16} color="#39FF14" />
              <View>
                <Text style={styles.toggleLabel}>TTS 자동 재생</Text>
                <Text style={styles.toggleDesc}>Claude 응답을 자동으로 읽어줌</Text>
              </View>
            </View>
            <Switch
              value={ttsEnabled}
              onValueChange={setTtsEnabled}
              trackColor={{ false: "#222", true: "rgba(57,255,20,0.4)" }}
              thumbColor={ttsEnabled ? "#39FF14" : "#555"}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Globe size={16} color="#39FF14" />
              <View>
                <Text style={styles.toggleLabel}>영어 학습 모드</Text>
                <Text style={styles.toggleDesc}>Claude가 영어로 답변하고 읽어줌</Text>
              </View>
            </View>
            <Switch
              value={englishMode}
              onValueChange={setEnglishMode}
              trackColor={{ false: "#222", true: "rgba(57,255,20,0.4)" }}
              thumbColor={englishMode ? "#39FF14" : "#555"}
            />
          </View>
        </View>

        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>버전</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phase</Text>
            <Text style={styles.infoValue}>1 — UI 셋업</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scroll: { padding: 24, gap: 24 },
  pageTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  section: { backgroundColor: "#0e0e0e", borderRadius: 20, padding: 20, gap: 16 },
  sectionTitle: { color: "#39FF14", fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  field: { gap: 8 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldLabel: { color: "#ccc", fontSize: 14, fontWeight: "700" },
  input: { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14 },
  fieldHint: { color: "#444", fontSize: 12 },
  saveBtn: { backgroundColor: "#39FF14", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#000", fontSize: 15, fontWeight: "900" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleLabel: { color: "#ccc", fontSize: 14, fontWeight: "700" },
  toggleDesc: { color: "#444", fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { color: "#555", fontSize: 14 },
  infoValue: { color: "#888", fontSize: 14 },
});
