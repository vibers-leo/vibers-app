import NaverLogin from "@react-native-seoul/naver-login";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://vibers.co.kr";

export function initNaverLogin() {
  NaverLogin.initialize({
    appName: "Vibers",
    consumerKey: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID || "",
    consumerSecret: process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET || "",
    serviceUrlScheme: "vibers",
  });
}

export async function signInWithNaver() {
  const { successResponse, failureResponse } = await NaverLogin.login();
  if (!successResponse) {
    throw new Error(failureResponse?.message || "네이버 로그인 실패");
  }

  const res = await fetch(`${API_BASE}/api/auth/naver`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: successResponse.accessToken }),
  });
  if (!res.ok) throw new Error("서버 인증 실패");
  const { customToken } = await res.json();

  const result = await signInWithCustomToken(auth, customToken);
  return result.user;
}
