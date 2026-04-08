import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
}

export async function stopRecording(openaiKey: string): Promise<string> {
  if (!recording) throw new Error("녹음 중이 아닙니다");
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = recording.getURI();
  recording = null;
  if (!uri) throw new Error("녹음 파일 없음");
  return transcribeWithWhisper(uri, openaiKey);
}

async function transcribeWithWhisper(uri: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: "audio.m4a",
    type: "audio/m4a",
  } as any);
  formData.append("model", "whisper-1");
  formData.append("language", "ko");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Whisper 오류 ${res.status}`);
  }
  const data = await res.json();
  return data.text;
}
