<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTripStore } from '@/stores/useTripStore';
import GenerateLoading from './GenerateLoading.vue';
import AiTicketModal from './input-sheet/AiTicketModal.vue';
import AiInputSheetHeader from './input-sheet/AiInputSheetHeader.vue';
import AiInputDetailSteps from './input-sheet/AiInputDetailSteps.vue';
import AiInputChatStep from './input-sheet/AiInputChatStep.vue';
import {
  interestOptions,
  mobilityOptions,
  simOptions,
} from './input-sheet/aiInputFlowConstants';
import {
  AI_SHEET_DRAFT_KEY,
  clearAiSheetSession,
  consumeDetailReturnIntent,
  setDetailReturnIntent,
} from '@/utils/aiSheetSession';

const { t } = useI18n()
const emit = defineEmits(['close', 'generated'])
const router = useRouter()
const tripStore = useTripStore()

function formatLocalIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const _today = new Date();
const _defaultEnd = new Date(_today);
_defaultEnd.setDate(_defaultEnd.getDate() + 2);

const step = ref('input');
const loadingRef = ref(null);
const flowStage = ref('primary');
const detailPage = ref(1);
const specialRequest = ref('');
const showTopGuide = ref(false);
const chatStructured = ref(null);
const chatThread = ref([]);
const preserveChatMapOnExit = ref(false);
const generatingInitialCourse = ref(false);

const startDate = ref(formatLocalIsoDate(_today));
const endDate = ref(formatLocalIsoDate(_defaultEnd));
const arrivalTime = ref('14:00');
const departureTime = ref('10:00');
const partySize = ref(2);
const relationship = ref('친구');
const mobilityMode = ref('public');
const simOption = ref('skip');
const interests = ref([]);
const density = ref(50);

const selectedInterestLabels = computed(() =>
  interestOptions
    .filter((item) => interests.value.includes(item.id))
    .map((item) => item.label),
);
const selectedMobilityLabel = computed(
  () => {
    const found = mobilityOptions.find((item) => item.id === mobilityMode.value)
    return found ? t(found.labelKey) : t('ai.mobility.public')
  },
)
const selectedSimLabel = computed(
  () => {
    const found = simOptions.find((item) => item.id === simOption.value)
    return found ? t(found.labelKey) : t('ai.sim.skip')
  },
)

const stylePresetFromSlider = computed(() => {
  const local = density.value;
  if (local <= 5) return 'main100';
  if (local <= 35) return 'main70';
  if (local <= 65) return 'balanced';
  if (local <= 90) return 'local70';
  return 'local100';
});

const styleRatioFromSlider = computed(() => ({
  main: 100 - density.value,
  local: density.value,
}));

const needsPartyInput = computed(
  () => relationship.value === '친구' || relationship.value === '가족',
);

watch(
  relationship,
  (id) => {
    if (id === '혼자') partySize.value = 1;
    else if (id === '연인') partySize.value = 2;
    else if (id === '친구' || id === '가족') {
      if (partySize.value < 2) partySize.value = 2;
    }
  },
  { immediate: true },
);

const canGenerate = computed(() => {
  let okParty = partySize.value >= 1 && partySize.value <= 20;
  if (relationship.value === '혼자') okParty = partySize.value === 1;
  else if (relationship.value === '연인') okParty = partySize.value === 2;
  else if (relationship.value === '친구' || relationship.value === '가족')
    okParty = partySize.value >= 2 && partySize.value <= 20;

  return (
    startDate.value &&
    endDate.value &&
    startDate.value <= endDate.value &&
    okParty &&
    relationship.value &&
    mobilityMode.value &&
    simOption.value &&
    interests.value.length > 0
  );
});

const canProceedChat = computed(
  () => flowStage.value === 'detail' && canGenerate.value,
);

const canSubmitGenerate = computed(
  () => flowStage.value === 'chat' && canGenerate.value,
);

const chatSummaryMessage = computed(() => {
  const extra = specialRequest.value.trim();
  const lines = [
    '[여행 코스 요청]',
    `기간: ${startDate.value} ~ ${endDate.value} (${durationLabel.value || '-'})`,
    `비행: 도착 ${arrivalTime.value} · 출발 ${departureTime.value}`,
    `동행: ${relationship.value} · ${partySize.value}명`,
    `이동: ${selectedMobilityLabel.value}`,
    `유심: ${selectedSimLabel.value}`,
    `스타일: 로컬 ${density.value}% · 관광지 ${100 - density.value}%`,
    `테마: ${selectedInterestLabels.value.join(', ') || '-'}`,
  ];
  if (extra) lines.push(`추가 요청: ${extra}`);
  return lines.join('\n');
});

const canProceedPrimary = computed(() => {
  const d0 = startDate.value.trim();
  const d1 = endDate.value.trim();
  return (
    isValidIsoDateStr(d0) &&
    isValidIsoDateStr(d1) &&
    d0 <= d1 &&
    isValidTimeHm(arrivalTime.value) &&
    isValidTimeHm(departureTime.value)
  );
});

const durationLabel = computed(() => {
  if (!startDate.value || !endDate.value || startDate.value > endDate.value)
    return '';
  const from = new Date(startDate.value);
  const to = new Date(endDate.value);
  const nights = Math.ceil((to - from) / 86400000);
  const days = nights + 1;
  return `${nights}박 ${days}일`;
});

async function proceedToDetail() {
  if (!canProceedPrimary.value) return;
  detailPage.value = 1;
  flowStage.value = 'detail';
}

function proceedToChat() {
  if (!canProceedChat.value) return;
  preserveChatMapOnExit.value = false;
  generatingInitialCourse.value = true;
  flowStage.value = 'chat';
}

function backToDetail() {
  detailPage.value = 2;
  flowStage.value = 'detail';
}

async function generate() {
  if (!canSubmitGenerate.value) return;

  preserveChatMapOnExit.value = !!chatStructured.value;
  step.value = 'loading';

  tripStore.setInput({
    duration: durationLabel.value || '1박 2일',
    interests: interests.value,
    travelType: relationship.value,
    density: styleRatioFromSlider.value.main,
    dateRange: {
      startDate: startDate.value,
      endDate: endDate.value,
    },
    flight: {
      arrivalTime: arrivalTime.value,
      departureTime: departureTime.value,
    },
    partySize: partySize.value,
    relationship: relationship.value,
    mobilityMode: mobilityMode.value,
    simOption: simOption.value,
    stylePreset: stylePresetFromSlider.value,
    styleRatio: styleRatioFromSlider.value,
    specialRequest: specialRequest.value.trim(),
  });

  if (chatStructured.value) {
    tripStore.setAiStructured(chatStructured.value, null);
  } else {
    await tripStore.generateCourse();
  }
  loadingRef.value?.complete();

  setTimeout(() => {
    clearDraftState();
    emit('generated');
    router.push('/result');
  }, 600);
}

const sheetRef = ref(null);
let startYPoint = 0;

function onTouchStart(e) {
  startYPoint = e.touches[0].clientY;
}

function onTouchEnd(e) {
  const deltaY = e.changedTouches[0].clientY - startYPoint;
  if (deltaY > 80) emit('close');
}

const showTicketModal = computed(
  () => step.value === 'input' && flowStage.value === 'primary',
);

function isValidIsoDateStr(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(`${s}T12:00:00`).getTime();
  return !Number.isNaN(t);
}

function isValidTimeHm(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s || '').trim());
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

function normalizeTimeHm(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s || '').trim());
  if (!m) return s;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function blurArrivalTime() {
  if (arrivalTime.value) arrivalTime.value = normalizeTimeHm(arrivalTime.value);
}

function blurDepartureTime() {
  if (departureTime.value)
    departureTime.value = normalizeTimeHm(departureTime.value);
}

function focusStartDate() {
  showTopGuide.value = true;
}

function blurStartDate() {
  showTopGuide.value = false;
}

function buildDraftState() {
  return {
    flowStage: flowStage.value,
    detailPage: detailPage.value,
    specialRequest: specialRequest.value,
    chatStructured: chatStructured.value,
    chatThread: chatThread.value,
    preserveChatMapOnExit: preserveChatMapOnExit.value,
    startDate: startDate.value,
    endDate: endDate.value,
    arrivalTime: arrivalTime.value,
    departureTime: departureTime.value,
    partySize: partySize.value,
    relationship: relationship.value,
    mobilityMode: mobilityMode.value,
    simOption: simOption.value,
    interests: interests.value,
    density: density.value,
  };
}

function prepareDraftForDetailReturn() {
  saveDraftState();
  setDetailReturnIntent();
}

function saveDraftState() {
  try {
    sessionStorage.setItem(
      AI_SHEET_DRAFT_KEY,
      JSON.stringify(buildDraftState()),
    );
  } catch {
    // ignore storage failures
  }
}

function clearDraftState() {
  clearAiSheetSession();
}

function restoreDraftState() {
  try {
    const raw = sessionStorage.getItem(AI_SHEET_DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;

    flowStage.value =
      d.flowStage === 'chat' || d.flowStage === 'detail'
        ? d.flowStage
        : flowStage.value;
    detailPage.value = Number.isInteger(d.detailPage)
      ? d.detailPage
      : detailPage.value;
    specialRequest.value =
      typeof d.specialRequest === 'string'
        ? d.specialRequest
        : specialRequest.value;
    chatStructured.value =
      d.chatStructured && typeof d.chatStructured === 'object'
        ? d.chatStructured
        : null;
    chatThread.value = Array.isArray(d.chatThread) ? d.chatThread : [];
    preserveChatMapOnExit.value = !!d.preserveChatMapOnExit;
    startDate.value =
      typeof d.startDate === 'string' ? d.startDate : startDate.value;
    endDate.value = typeof d.endDate === 'string' ? d.endDate : endDate.value;
    arrivalTime.value =
      typeof d.arrivalTime === 'string' ? d.arrivalTime : arrivalTime.value;
    departureTime.value =
      typeof d.departureTime === 'string'
        ? d.departureTime
        : departureTime.value;
    partySize.value = Number.isFinite(Number(d.partySize))
      ? Number(d.partySize)
      : partySize.value;
    relationship.value =
      typeof d.relationship === 'string' ? d.relationship : relationship.value;
    mobilityMode.value =
      typeof d.mobilityMode === 'string' ? d.mobilityMode : mobilityMode.value;
    simOption.value =
      typeof d.simOption === 'string' ? d.simOption : simOption.value;
    interests.value = Array.isArray(d.interests)
      ? d.interests
      : interests.value;
    density.value = Number.isFinite(Number(d.density))
      ? Number(d.density)
      : density.value;
  } catch {
    // ignore parse failures
  }
}

onMounted(() => {
  if (consumeDetailReturnIntent()) {
    restoreDraftState();
  } else {
    clearAiSheetSession();
  }
});
</script>

<template>
  <Transition name="sheet-overlay">
    <div
      class="sheet-overlay"
      :class="{ 'sheet-overlay--ticket': showTicketModal }"
      @click.self="emit('close')"
    >
      <Transition name="guide-fade">
        <p v-if="showTicketModal && showTopGuide" class="sheet-top-guide">
          {{ $t('ai.sheet.topGuide') }}
        </p>
      </Transition>

      <AiTicketModal
        v-if="showTicketModal"
        v-model:start-date="startDate"
        v-model:end-date="endDate"
        v-model:arrival-time="arrivalTime"
        v-model:departure-time="departureTime"
        :duration-label="durationLabel"
        :can-proceed-primary="canProceedPrimary"
        @next="proceedToDetail"
        @close="emit('close')"
        @focus-start-date="focusStartDate"
        @blur-start-date="blurStartDate"
        @blur-arrival="blurArrivalTime"
        @blur-departure="blurDepartureTime"
      />

      <Transition v-else name="sheet-slide">
        <div
          ref="sheetRef"
          class="sheet"
          :class="{ 'sheet--chat-mode': flowStage === 'chat' }"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <div class="sheet__handle-area" @click="emit('close')">
            <div class="sheet__handle"></div>
          </div>

          <AiInputSheetHeader @close="emit('close')" />

          <div
            v-if="step === 'input'"
            class="sheet__body"
            :class="{ 'sheet__body--chat': flowStage === 'chat' }"
          >
            <AiInputDetailSteps
              v-if="flowStage === 'detail'"
              v-model:relationship="relationship"
              v-model:party-size="partySize"
              v-model:mobility-mode="mobilityMode"
              v-model:sim-option="simOption"
              v-model:density="density"
              v-model:interests="interests"
              v-model:special-request="specialRequest"
              v-model:detail-page="detailPage"
              :needs-party-input="needsPartyInput"
              :can-proceed-chat="canProceedChat"
              :is-generating-course="generatingInitialCourse"
              @proceed-chat="proceedToChat"
            />

            <AiInputChatStep
              v-if="flowStage === 'chat'"
              :summary-text="chatSummaryMessage"
              :initial-structured="chatStructured"
              :initial-thread="chatThread"
              :can-submit-generate="canSubmitGenerate"
              :preserve-map-on-exit="preserveChatMapOnExit"
              :local-ratio="density"
              @back="backToDetail"
              @generate="generate"
              @structured-change="chatStructured = $event"
              @thread-snapshot="chatThread = $event"
              @bootstrap-complete="generatingInitialCourse = false"
              @before-navigate-detail="prepareDraftForDetailReturn"
            />
          </div>

          <div v-else class="sheet__body sheet__body--loading">
            <GenerateLoading ref="loadingRef" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-top-guide {
  position: absolute;
  top: calc(max(10px, env(safe-area-inset-top)) + 2px);
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  width: min(92vw, 430px);
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  color: #4b4b4b;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
  z-index: 220;
}

.sheet-overlay--ticket {
  align-items: flex-start;
  justify-content: center;
  padding-top: calc(
    max(12px, env(safe-area-inset-top)) + clamp(12px, 8vh, 56px)
  );
  padding-right: max(14px, env(safe-area-inset-right));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  padding-left: max(14px, env(safe-area-inset-left));
  background: rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.sheet {
  width: 100%;
  max-width: 430px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet--chat-mode {
  max-height: 100dvh;
  height: min(96dvh, calc(100dvh - max(12px, env(safe-area-inset-top))));
  border-radius: 20px 20px 0 0;
}

.sheet__handle-area {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
  cursor: pointer;
}

.sheet__handle {
  width: 40px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.sheet__body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  scrollbar-width: none;
}

.sheet__body::-webkit-scrollbar {
  display: none;
}

.sheet__body--loading {
  justify-content: center;
  align-items: center;
  min-height: 280px;
}

.sheet__body--chat {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

.sheet-overlay-enter-active,
.sheet-overlay-leave-active {
  transition: background 0.3s;
}
.sheet-overlay-enter-from,
.sheet-overlay-leave-to {
  background: rgba(0, 0, 0, 0);
}

.sheet-slide-enter-active {
  transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}

.guide-fade-enter-active,
.guide-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

@media (max-width: 480px) {
  .sheet-overlay--ticket {
    padding-right: max(8px, env(safe-area-inset-right));
    padding-left: max(8px, env(safe-area-inset-left));
  }
}
</style>
