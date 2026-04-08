import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Key, Volume2, Globe, CheckCircle } from "lucide-react-native";
import { PROVIDERS, STORE_KEYS, loadSettings, type Provider } from "../../services/ai-client";

export default function SettingsScreen() {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [keys, setKeys] = useState({ claude: "", gemini: "", groq: "", openai: "" });
  const [englishMode, setEnglishMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
      setKeys({ claude: s.claudeKey, gemini: s.geminiKey, groq: s.groqKey, openai: s.openaiKey });
      setEnglishMode(s.englishMode);
      setTtsEnabled(s.ttsEnabled);
    });
  }, []);

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  const onSelectProvider = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDERS.find((x) => x.id === p)!.models[0].id);
  };

  const save = async () => {
    await Promise.all([
      SecureStore.setItemAsync(STORE_KEYS.provider, provider),
      SecureStore.setItemAsync(STORE_KEYS.model, model),
      SecureStore.setItemAsync(STORE_KEYS.claudeKey, keys.claude),
      SecureStore.setItemAsync(STORE_KEYS.geminiKey, keys.gemini),
      SecureStore.setItemAsync(STORE_KEYS.groqKey, keys.groq),
      SecureStore.setItemAsync(STORE_KEYS.openaiKey, keys.openai),
      SecureStore.setItemAsync(STORE_KEYS.englishMode, String(englishMode)),
      SecureStore.setItemAsync(STORE_KEYS.ttsEnabled, String(ttsEnabled)),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>설정</Text>

        {/* AI 모델 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI 모델</Text>
          {PROVIDERS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.providerRow, provider === p.id && styles.providerRowActive]}
              onPress={() => onSelectProvider(p.id)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                {p.free && <Text style={styles.freeBadge}>무료</Text>}
              </View>
              {provider === p.id && <CheckCircle size={20} color="#39FF14" />}
            </TouchableOpacity>
          ))}

          {/* 모델 선택 */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>모델 선택</Text>
          {currentProvider.models.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modelRow, model === m.id && styles.modelRowActive]}
              onPress={() => setModel(m.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.modelName, model === m.id && styles.modelNameActive]}>{m.name}</Text>
              {model === m.id && <CheckCircle size={16} color="#39FF14" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* API 키 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API 키</Text>

          {PROVIDERS.map((p) => (
            <View key={p.id} style={styles.field}>
              <View style={styles.fieldHeader}>
                <Key size={14} color={provider === p.id ? "#39FF14" : "#555"} />
                <Text style={[styles.fieldLabel, provider !== p.id && styles.fieldLabelDim]}>
                  {p.name}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                value={keys[p.id as keyof typeof keys]}
                onChangeText={(v) => setKeys((k) => ({ ...k, [p.id]: v }))}
                placeholder={p.keyPlaceholder}
                placeholderTextColor="#333"
                secureTextEntry
                autoCapitalize="none"
              />
              <Text style={styles.fieldHint}>{p.keyHint}</Text>
            </View>
          ))}

          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Key size={14} color="#555" />
              <Text style={styles.fieldLabelDim}>OpenAI API Key (음성 STT)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={keys.openai}
              onChangeText={(v) => setKeys((k) => ({ ...k, openai: v }))}
              placeholder="sk-..."
              placeholderTextColor="#333"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.fieldHint}>platform.openai.com에서 발급 (Whisper STT용)</Text>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnDone]} onPress={save} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>{saved ? "저장됨 ✓" : "저장"}</Text>
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
                <Text style={styles.toggleDesc}>AI 응답을 자동으로 읽어줌</Text>
              </View>
            </View>
            <Switch value={ttsEnabled} onValueChange={setTtsEnabled}
              trackColor={{ false: "#222", true: "rgba(57,255,20,0.4)" }}
              thumbColor={ttsEnabled ? "#39FF14" : "#555"} />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Globe size={16} color="#39FF14" />
              <View>
                <Text style={styles.toggleLabel}>영어 학습 모드</Text>
                <Text style={styles.toggleDesc}>AI가 영어로 답변하고 읽어줌</Text>
              </View>
            </View>
            <Switch value={englishMode} onValueChange={setEnglishMode}
              trackColor={{ false: "#222", true: "rgba(57,255,20,0.4)" }}
              thumbColor={englishMode ? "#39FF14" : "#555"} />
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
            <Text style={styles.infoValue}>2 — AI 연결 완료</Text>
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
  section: { backgroundColor: "#0e0e0e", borderRadius: 20, padding: 20, gap: 14 },
  sectionTitle: { color: "#39FF14", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  providerRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1a1a1a", backgroundColor: "#0a0a0a" },
  providerRowActive: { borderColor: "#39FF14", backgroundColor: "rgba(57,255,20,0.05)" },
  providerName: { color: "#ccc", fontSize: 14, fontWeight: "700" },
  freeBadge: { color: "#39FF14", fontSize: 11, fontWeight: "700", marginTop: 2 },
  modelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#1a1a1a" },
  modelRowActive: { borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.04)" },
  modelName: { color: "#666", fontSize: 13 },
  modelNameActive: { color: "#ccc", fontWeight: "600" },
  field: { gap: 6 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldLabel: { color: "#ccc", fontSize: 13, fontWeight: "700" },
  fieldLabelDim: { color: "#555", fontSize: 13 },
  input: { backgroundColor: "#111", borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 13 },
  fieldHint: { color: "#333", fontSize: 11 },
  saveBtn: { backgroundColor: "#39FF14", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveBtnDone: { backgroundColor: "#1a3d0a" },
  saveBtnText: { color: "#000", fontSize: 15, fontWeight: "900" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleLabel: { color: "#ccc", fontSize: 14, fontWeight: "700" },
  toggleDesc: { color: "#444", fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { color: "#555", fontSize: 14 },
  infoValue: { color: "#888", fontSize: 14 },
});
