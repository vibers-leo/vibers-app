import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Modal } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Key, Volume2, Globe, CheckCircle, Info, X } from "lucide-react-native";
import { STORE_KEYS, loadSettings, type Provider } from "../../services/ai-client";

// 모델 정보 (툴팁용)
const MODEL_INFO: Record<string, { desc: string; speed: string; free: boolean; best: string }> = {
  "claude-sonnet-4-6":        { desc: "Anthropic 최신 고성능 모델", speed: "보통", free: false, best: "복잡한 코딩, 분석" },
  "claude-haiku-4-5-20251001":{ desc: "Claude 경량 고속 모델", speed: "빠름", free: false, best: "빠른 답변, 간단한 질문" },
  "gemini-2.0-flash-lite":    { desc: "Google 최신 경량 무료 모델", speed: "매우 빠름", free: true, best: "일반 대화, 코딩 질문" },
  "gemini-2.5-flash-preview-04-17": { desc: "Google 최신 고성능 무료 모델", speed: "보통", free: true, best: "복잡한 추론, 긴 문서" },
  "gemini-1.5-flash":         { desc: "Google 안정적인 무료 모델", speed: "빠름", free: true, best: "안정적인 범용 사용" },
  "llama-3.3-70b-versatile":  { desc: "Meta Llama 70B (Groq 초고속)", speed: "초고속", free: true, best: "코딩, 번역, 분석" },
  "gemma2-9b-it":             { desc: "Google Gemma 2 9B (Groq)", speed: "초고속", free: true, best: "가벼운 대화, 빠른 응답" },
};

const PROVIDER_MODELS: Record<Provider, { id: string; name: string }[]> = {
  claude: [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
  gemini: [
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
    { id: "gemini-2.5-flash-preview-04-17", name: "Gemini 2.5 Flash" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
    { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  ],
};

function detectProvider(keys: { claude: string; gemini: string; groq: string }): Provider | null {
  if (keys.claude.startsWith("sk-ant-")) return "claude";
  if (keys.gemini.startsWith("AIza")) return "gemini";
  if (keys.groq.startsWith("gsk_")) return "groq";
  return null;
}

export default function SettingsScreen() {
  const [keys, setKeys] = useState({ claude: "", gemini: "", groq: "", openai: "" });
  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState("gemini-2.0-flash-lite");
  const [englishMode, setEnglishMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [modalModel, setModalModel] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setProvider(s.provider);
      setModel(s.model);
      setKeys({ claude: s.claudeKey, gemini: s.geminiKey, groq: s.groqKey, openai: s.openaiKey });
      setEnglishMode(s.englishMode);
      setTtsEnabled(s.ttsEnabled);
    });
  }, []);

  // 키 변경 시 프로바이더 자동 감지
  const onKeyChange = (k: keyof typeof keys, v: string) => {
    const newKeys = { ...keys, [k]: v };
    setKeys(newKeys);
    const detected = detectProvider(newKeys);
    if (detected && detected !== provider) {
      setProvider(detected);
      setModel(PROVIDER_MODELS[detected][0].id);
    }
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

  const modelInfo = modalModel ? MODEL_INFO[modalModel] : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>설정</Text>

        {/* API 키 입력 — 키 넣으면 자동 감지 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API 키</Text>
          <Text style={styles.sectionDesc}>키를 입력하면 AI 모델이 자동으로 선택됩니다</Text>

          {[
            { k: "gemini" as const, label: "Gemini (Google)", placeholder: "AIza...", hint: "aistudio.google.com — 무료", active: provider === "gemini" },
            { k: "groq" as const, label: "Groq (Llama)", placeholder: "gsk_...", hint: "console.groq.com — 무료", active: provider === "groq" },
            { k: "claude" as const, label: "Claude (Anthropic)", placeholder: "sk-ant-...", hint: "console.anthropic.com — 유료", active: provider === "claude" },
            { k: "openai" as const, label: "OpenAI (음성 STT)", placeholder: "sk-...", hint: "platform.openai.com — Whisper용", active: false },
          ].map(({ k, label, placeholder, hint, active }) => (
            <View key={k} style={styles.field}>
              <View style={styles.fieldHeader}>
                <Key size={13} color={active ? "#39FF14" : "#444"} />
                <Text style={[styles.fieldLabel, active && styles.fieldLabelActive]}>{label}</Text>
                {active && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>사용 중</Text></View>}
              </View>
              <TextInput
                style={[styles.input, active && styles.inputActive]}
                value={keys[k]}
                onChangeText={(v) => onKeyChange(k, v)}
                placeholder={placeholder}
                placeholderTextColor="#2a2a2a"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.fieldHint}>{hint}</Text>
            </View>
          ))}
        </View>

        {/* 모델 선택 + 정보 버튼 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>모델 선택</Text>
          <Text style={styles.sectionDesc}>
            {provider === "gemini" ? "Gemini" : provider === "groq" ? "Groq" : "Claude"} 모델 중 선택
          </Text>
          {PROVIDER_MODELS[provider].map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modelRow, model === m.id && styles.modelRowActive]}
              onPress={() => setModel(m.id)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.modelName, model === m.id && styles.modelNameActive]}>{m.name}</Text>
                {MODEL_INFO[m.id]?.free && <Text style={styles.freeBadge}>무료</Text>}
              </View>
              <TouchableOpacity onPress={() => setModalModel(m.id)} style={styles.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Info size={15} color="#444" />
              </TouchableOpacity>
              {model === m.id && <CheckCircle size={16} color="#39FF14" />}
            </TouchableOpacity>
          ))}

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>버전</Text><Text style={styles.infoValue}>1.0.0</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Phase</Text><Text style={styles.infoValue}>4 — VeryTerm 연동</Text></View>
        </View>
      </ScrollView>

      {/* 모델 정보 모달 */}
      <Modal visible={!!modalModel} transparent animationType="fade" onRequestClose={() => setModalModel(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalModel(null)}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{PROVIDER_MODELS[provider].find(m => m.id === modalModel)?.name}</Text>
              <TouchableOpacity onPress={() => setModalModel(null)}><X size={18} color="#555" /></TouchableOpacity>
            </View>
            {modelInfo && (
              <View style={{ gap: 12 }}>
                <Text style={styles.modalDesc}>{modelInfo.desc}</Text>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>속도</Text>
                  <Text style={styles.modalVal}>{modelInfo.speed}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>가격</Text>
                  <Text style={[styles.modalVal, { color: modelInfo.free ? "#39FF14" : "#ff9900" }]}>
                    {modelInfo.free ? "무료" : "유료"}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>추천 용도</Text>
                  <Text style={styles.modalVal}>{modelInfo.best}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, { marginTop: 4 }]}
                  onPress={() => { setModel(modalModel!); setModalModel(null); }}
                >
                  <Text style={styles.saveBtnText}>이 모델 선택</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  scroll: { padding: 24, gap: 24 },
  pageTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  section: { backgroundColor: "#0e0e0e", borderRadius: 20, padding: 20, gap: 14 },
  sectionTitle: { color: "#39FF14", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  sectionDesc: { color: "#444", fontSize: 12, marginTop: -8 },
  field: { gap: 6 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldLabel: { color: "#555", fontSize: 13, fontWeight: "600", flex: 1 },
  fieldLabelActive: { color: "#ccc" },
  activeBadge: { backgroundColor: "rgba(57,255,20,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: "#39FF14", fontSize: 10, fontWeight: "800" },
  input: { backgroundColor: "#111", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 13, height: 46 },
  inputActive: { borderColor: "rgba(57,255,20,0.3)" },
  fieldHint: { color: "#2e2e2e", fontSize: 11 },
  modelRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#1a1a1a" },
  modelRowActive: { borderColor: "rgba(57,255,20,0.3)", backgroundColor: "rgba(57,255,20,0.04)" },
  modelName: { color: "#666", fontSize: 13 },
  modelNameActive: { color: "#ccc", fontWeight: "600" },
  freeBadge: { color: "#39FF14", fontSize: 10, fontWeight: "700", marginTop: 2 },
  infoBtn: { padding: 4 },
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
  // 모달
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { backgroundColor: "#111", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#222", gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  modalDesc: { color: "#888", fontSize: 14, lineHeight: 20 },
  modalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalKey: { color: "#555", fontSize: 13 },
  modalVal: { color: "#ccc", fontSize: 13, fontWeight: "600" },
});
