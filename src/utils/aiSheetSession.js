/** AI 입력 시트 draft — 일정 카드 → 상세 → 뒤로 복귀할 때만 유지 */

export const AI_SHEET_DRAFT_KEY = 'bts.ai.sheet.draft.v1'
export const AI_SHEET_DETAIL_RETURN_KEY = 'bts.ai.sheet.detailReturn.v1'

export function isAiDetailPath(path) {
  const p = String(path || '')
  return /^\/attractions\/[^/]+$/.test(p)
    || /^\/events\/[^/]+$/.test(p)
    || /^\/lockers\/[^/]+$/.test(p)
}

export function setDetailReturnIntent() {
  try {
    sessionStorage.setItem(AI_SHEET_DETAIL_RETURN_KEY, '1')
  } catch {
    // ignore
  }
}

/** 상세에서 돌아와 복원할지 여부. true면 플래그 제거(소비) */
export function consumeDetailReturnIntent() {
  try {
    if (sessionStorage.getItem(AI_SHEET_DETAIL_RETURN_KEY) !== '1') return false
    sessionStorage.removeItem(AI_SHEET_DETAIL_RETURN_KEY)
    return true
  } catch {
    return false
  }
}

export function clearAiSheetSession() {
  try {
    sessionStorage.removeItem(AI_SHEET_DRAFT_KEY)
    sessionStorage.removeItem(AI_SHEET_DETAIL_RETURN_KEY)
  } catch {
    // ignore
  }
}
