import AsyncStorage from "@react-native-async-storage/async-storage";

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_KEY = "chat_sessions";
const MAX_SESSIONS = 50;

/** 세션 목록 로드 (메타데이터만, 메시지 제외) */
export async function loadSessionList(): Promise<Omit<ChatSession, "messages">[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  const sessions: ChatSession[] = JSON.parse(raw);
  return sessions
    .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 특정 세션의 메시지 로드 */
export async function loadSession(sessionId: string): Promise<ChatSession | null> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return null;
  const sessions: ChatSession[] = JSON.parse(raw);
  return sessions.find((s) => s.id === sessionId) || null;
}

/** 세션 저장 (새로 만들거나 업데이트) */
export async function saveSession(session: ChatSession): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  let sessions: ChatSession[] = raw ? JSON.parse(raw) : [];

  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }

  // 최대 갯수 제한
  if (sessions.length > MAX_SESSIONS) {
    sessions = sessions.slice(0, MAX_SESSIONS);
  }

  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/** 세션 삭제 */
export async function deleteSession(sessionId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return;
  const sessions: ChatSession[] = JSON.parse(raw);
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
}

/** 전체 삭제 */
export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(SESSIONS_KEY);
}

/** 메시지 배열에서 제목 자동 생성 (첫 사용자 메시지 앞 20자) */
export function generateTitle(messages: StoredMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "새 대화";
  const text = firstUser.content.trim();
  return text.length > 20 ? text.slice(0, 20) + "..." : text;
}
