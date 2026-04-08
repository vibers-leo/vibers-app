import * as Speech from "expo-speech";

export async function speak(text: string, englishMode: boolean): Promise<void> {
  Speech.stop();
  Speech.speak(text, {
    language: englishMode ? "en-US" : "ko-KR",
    rate: englishMode ? 0.9 : 1.0,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
