import * as Speech from "expo-speech";
import { edgeSpeak, edgeStopSpeaking, type VoiceKey } from "./edge-tts";

// expo-av 제거로 Edge TTS 비활성화 — expo-speech만 사용
let useEdge = false;

/**
 * TTS 재생 — Edge TTS 우선, 실패 시 expo-speech 폴백
 */
export async function speak(text: string, englishMode: boolean, voice?: VoiceKey): Promise<void> {
  stopSpeaking();

  if (useEdge) {
    try {
      await edgeSpeak(text, englishMode, voice);
      return;
    } catch (e) {
      console.warn("[TTS] Edge TTS 실패, expo-speech 폴백:", e);
      useEdge = false;
    }
  }

  // 폴백: 디바이스 기본 TTS
  Speech.speak(text, {
    language: englishMode ? "en-US" : "ko-KR",
    rate: englishMode ? 0.9 : 1.0,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  edgeStopSpeaking().catch(() => {});
  Speech.stop();
}
