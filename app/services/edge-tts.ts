// @ts-ignore — expo-file-system v55 legacy API
import * as FileSystem from "expo-file-system";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}`;

// 한국어/영어 음성
const VOICES = {
  "ko-female": "ko-KR-SunHiNeural",
  "ko-male": "ko-KR-InJoonNeural",
  "en-female": "en-US-JennyNeural",
  "en-male": "en-US-GuyNeural",
};

export type VoiceKey = keyof typeof VOICES;

function uuid() {
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function timestamp(): string {
  return new Date().toISOString();
}

let currentAudio: any = null;

/**
 * Edge TTS로 음성 합성 후 재생
 */
export function edgeSpeak(
  text: string,
  englishMode: boolean,
  voice?: VoiceKey
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (!text.trim()) {
      resolve();
      return;
    }

    // 4000자 제한 — 길면 자르기
    const trimmed = text.length > 3500 ? text.slice(0, 3500) + "..." : text;
    const voiceName = VOICES[voice || (englishMode ? "en-female" : "ko-female")];
    const connId = uuid();
    const requestId = uuid();

    const url = `${WSS_URL}&ConnectionId=${connId}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      reject(new Error("Edge TTS 연결 실패"));
      return;
    }

    const audioChunks: string[] = []; // base64 chunks
    let resolved = false;

    const cleanup = () => {
      try { ws.close(); } catch {}
    };

    // 10초 타임아웃
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Edge TTS 타임아웃"));
      }
    }, 15000);

    ws.onopen = () => {
      // 1) speech.config
      const configMsg =
        `X-Timestamp:${timestamp()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "false",
                },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        });
      ws.send(configMsg);

      // 2) SSML
      const ssmlMsg =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${timestamp()}Z\r\n` +
        `Path:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${englishMode ? "en-US" : "ko-KR"}'>` +
        `<voice name='${voiceName}'>` +
        `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>` +
        escapeXml(trimmed) +
        `</prosody></voice></speak>`;
      ws.send(ssmlMsg);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        // 텍스트 메시지 — turn.end 확인
        if (event.data.includes("Path:turn.end")) {
          clearTimeout(timeout);
          cleanup();
          playAudio(audioChunks)
            .then(() => { resolved = true; resolve(); })
            .catch((e) => { resolved = true; reject(e); });
        }
      } else {
        // 바이너리 메시지 — 오디오 데이터
        handleBinaryMessage(event.data, audioChunks);
      }
    };

    ws.onerror = (e: any) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error("Edge TTS 오류: " + (e.message || "WebSocket error")));
      }
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

/**
 * 바이너리 메시지에서 오디오 데이터 추출
 * RN WebSocket은 바이너리를 Blob으로 받음
 */
function handleBinaryMessage(data: any, chunks: string[]) {
  if (data instanceof ArrayBuffer) {
    extractAudioFromBuffer(data, chunks);
  } else if (data instanceof Blob) {
    // RN에서 Blob → ArrayBuffer 변환
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        extractAudioFromBuffer(reader.result, chunks);
      }
    };
    reader.readAsArrayBuffer(data);
  }
}

function extractAudioFromBuffer(buffer: ArrayBuffer, chunks: string[]) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 2) return;

  // 첫 2바이트 = 헤더 길이
  const headerLen = view.getUint16(0);
  if (buffer.byteLength <= headerLen + 2) return;

  // 헤더 이후가 MP3 오디오 데이터
  const audioData = buffer.slice(headerLen + 2);
  const base64 = arrayBufferToBase64(audioData);
  if (base64) chunks.push(base64);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * base64 오디오 청크를 파일로 저장 후 재생
 */
async function playAudio(base64Chunks: string[]): Promise<void> {
  if (base64Chunks.length === 0) return;

  const fullBase64 = base64Chunks.join("");
  const filePath = (FileSystem as any).cacheDirectory + "edge_tts_" + Date.now() + ".mp3";

  await (FileSystem as any).writeAsStringAsync(filePath, fullBase64, {
    encoding: (FileSystem as any).EncodingType.Base64,
  });

  // expo-av를 동적 import (Expo Go 호환)
  const { Audio } = await import("expo-av");

  // 이전 재생 중지
  if (currentAudio) {
    try { await currentAudio.unloadAsync(); } catch {}
  }

  const { sound } = await Audio.Sound.createAsync({ uri: filePath });
  currentAudio = sound;

  return new Promise((resolve) => {
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        currentAudio = null;
        // 임시 파일 삭제
        (FileSystem as any).deleteAsync(filePath, { idempotent: true }).catch(() => {});
        resolve();
      }
    });
    sound.playAsync();
  });
}

/**
 * 현재 재생 중지
 */
export async function edgeStopSpeaking(): Promise<void> {
  if (currentAudio) {
    try {
      await currentAudio.unloadAsync();
    } catch {}
    currentAudio = null;
  }
}
