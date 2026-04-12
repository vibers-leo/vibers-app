import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

let _resolveResult: ((text: string) => void) | null = null;
let _rejectResult: ((err: Error) => void) | null = null;
let _partialCallback: ((text: string) => void) | null = null;
let _finalText = "";

/**
 * 디바이스 내장 음성인식 시작 (무료, API 키 불필요)
 */
export async function startRecording(lang = "ko-KR"): Promise<void> {
  const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!granted) throw new Error("음성 인식 권한이 필요합니다");

  _finalText = "";

  ExpoSpeechRecognitionModule.start({
    lang,
    interimResults: true,
    continuous: false,
  });
}

/**
 * 음성인식 중지 → 결과 반환
 */
export function stopRecording(_openaiKey?: string, _englishMode?: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    _resolveResult = resolve;
    _rejectResult = reject;

    // 인식 중지 요청
    ExpoSpeechRecognitionModule.stop();

    // 5초 타임아웃 — stop 후에도 결과가 안 오면
    setTimeout(() => {
      if (_resolveResult) {
        _resolveResult(_finalText || "");
        _resolveResult = null;
        _rejectResult = null;
      }
    }, 5000);
  });
}

/**
 * 부분 인식 결과 콜백 설정 (실시간 타이핑 효과용)
 */
export function setPartialCallback(cb: ((text: string) => void) | null) {
  _partialCallback = cb;
}

/**
 * 이벤트 핸들러 — chat.tsx의 컴포넌트에서 호출
 * React Hook이 아닌 모듈 레벨로 이벤트 처리
 */
export function setupSpeechEvents(): () => void {
  const resultSub = ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
    const transcript = event.results?.[0]?.transcript || "";
    if (event.isFinal) {
      _finalText = transcript;
      if (_resolveResult) {
        _resolveResult(transcript);
        _resolveResult = null;
        _rejectResult = null;
      }
    } else {
      // 부분 결과
      _finalText = transcript;
      _partialCallback?.(transcript);
    }
  });

  const errorSub = ExpoSpeechRecognitionModule.addListener("error", (event: any) => {
    const msg = event.error || "음성 인식 오류";
    if (_rejectResult) {
      _rejectResult(new Error(msg));
      _resolveResult = null;
      _rejectResult = null;
    }
  });

  const endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
    // 인식 종료 — 결과가 아직 안 왔으면 현재까지의 텍스트 반환
    if (_resolveResult) {
      _resolveResult(_finalText || "");
      _resolveResult = null;
      _rejectResult = null;
    }
  });

  return () => {
    resultSub.remove();
    errorSub.remove();
    endSub.remove();
  };
}
