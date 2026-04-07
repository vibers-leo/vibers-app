import { login } from "@react-native-kakao/user";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://vibers.co.kr";

export async function signInWithKakao() {
  const result = await login();
  if (!result?.accessToken) {
    throw new Error("카카오 로그인 실패");
  }

  const res = await fetch(`${API_BASE}/api/auth/kakao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: result.accessToken }),
  });
  if (!res.ok) throw new Error("서버 인증 실패");
  const { customToken } = await res.json();

  const credential = await signInWithCustomToken(auth, customToken);
  return credential.user;
}
