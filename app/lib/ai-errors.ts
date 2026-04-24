export const AI_ERROR_MESSAGES = {
  GENERAL: "AI 기능이 아직 원활하지 않을 수 있어요. 관리자에게 알림을 보냈으니 잠시 후 다시 시도해 주세요.",
  RATE_LIMIT: "AI 사용량이 몰리고 있어요. 1~2분 뒤 다시 시도해 주세요.",
  DOWN: "AI 기능이 일시 중단됐어요. 관리자에게 알림이 전달됐고, 복구되면 다시 이용하실 수 있습니다.",
} as const;

export function getAIErrorMessage(error: any): string {
  const status = error?.status || error?.response?.status;
  if (status === 429 || status === 529) return AI_ERROR_MESSAGES.RATE_LIMIT;
  if (status >= 500) return AI_ERROR_MESSAGES.DOWN;
  return AI_ERROR_MESSAGES.GENERAL;
}
