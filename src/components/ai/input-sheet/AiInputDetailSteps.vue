<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import { interestOptions, mobilityOptions, personaOptions, relationshipOptions, simOptions } from './aiInputFlowConstants'

const { t } = useI18n()
const relationship = defineModel('relationship', { type: String, default: '친구' })
const partySize = defineModel('partySize', { type: Number, default: 2 })
const mobilityMode = defineModel('mobilityMode', { type: String, default: 'public' })
const simOption = defineModel('simOption', { type: String, default: 'skip' })
const density = defineModel('density', { type: Number, default: 50 })
const interests = defineModel('interests', { type: Array, default: () => [] })
const specialRequest = defineModel('specialRequest', { type: String, default: '' })
const detailPage = defineModel('detailPage', { type: Number, default: 1 })

const props = defineProps({
  needsPartyInput: { type: Boolean, default: false },
  canProceedChat: { type: Boolean, default: false },
  isGeneratingCourse: { type: Boolean, default: false },
})

const emit = defineEmits(['proceed-chat'])

const PARTY_MIN = 2
const PARTY_MAX = 20

const interestCount = computed(() => interests.value.length)
const atMaxInterests = computed(() => interestCount.value >= 3)
const selectedPersonaId = computed({
  get() {
    const current = Number(density.value)
    return personaOptions.find((item) => item.localDensity === current)?.id || 'balanced'
  },
  set(id) {
    const item = personaOptions.find((p) => p.id === id)
    if (item) density.value = item.localDensity
  },
})

function decrementParty() {
  if (!props.needsPartyInput) return
  if (partySize.value > PARTY_MIN) partySize.value -= 1
}

function incrementParty() {
  if (!props.needsPartyInput) return
  if (partySize.value < PARTY_MAX) partySize.value += 1
}

function toggleInterest(id) {
  const list = interests.value
  const index = list.indexOf(id)
  if (index === -1) {
    if (!atMaxInterests.value) list.push(id)
  } else {
    list.splice(index, 1)
  }
}

function onProceedChat() {
  emit('proceed-chat')
}

function goNextPage() {
  detailPage.value = 2
}

function goPrevPage() {
  detailPage.value = 1
}
</script>

<template>
  <div class="detail-steps">
    <div class="detail-steps__tabs" role="tablist" :aria-label="$t('ai.detail.inputStage')">
      <button
        type="button"
        class="detail-steps__tab"
        :class="{ 'detail-steps__tab--active': detailPage === 1 }"
        role="tab"
        :aria-selected="detailPage === 1"
        @click="detailPage = 1"
      >
        <span class="detail-steps__tab-num">1</span>
        {{ $t('ai.detail.tab1') }}
      </button>
      <button
        type="button"
        class="detail-steps__tab"
        :class="{ 'detail-steps__tab--active': detailPage === 2 }"
        role="tab"
        :aria-selected="detailPage === 2"
        @click="detailPage = 2"
      >
        <span class="detail-steps__tab-num">2</span>
        {{ $t('ai.detail.tab2') }}
      </button>
    </div>

    <div v-show="detailPage === 1" class="detail-steps__page">
    <section class="sheet__section">
      <div class="sheet__section-label">
        <span class="sheet__step-num">2</span>
        <span class="sheet__step-text">{{ $t('ai.detail.step2') }}</span>
      </div>
      <div class="sheet__chip-row">
        <button
          v-for="item in relationshipOptions"
          :key="item.id"
          class="travel-type-btn"
          :class="{ 'travel-type-btn--active': relationship === item.id }"
          @click="relationship = item.id"
        >
          <component
            :is="item.icon"
            class="travel-type-btn__icon"
            :size="20"
            :stroke-width="relationship === item.id ? 2.5 : 2.2"
            :color="item.color"
          />
          <span class="travel-type-btn__label">{{ $t(item.labelKey) }}</span>
        </button>
      </div>
      <div class="sheet__party-extra">
        <span class="sheet__field-label">{{ $t('ai.detail.partyCount') }}</span>
        <div
          class="sheet__stepper"
          :class="{ 'sheet__stepper--locked': !needsPartyInput }"
          role="group"
          :aria-label="$t('ai.detail.partyCount')"
          :aria-disabled="!needsPartyInput"
        >
          <button
            type="button"
            class="sheet__stepper-btn"
            :aria-label="$t('ai.detail.decrementParty')"
            :disabled="!needsPartyInput || partySize <= PARTY_MIN"
            @click="decrementParty"
          >
            −
          </button>
          <span class="sheet__stepper-value">{{ $t('ai.detail.partyCountUnit', { n: partySize }) }}</span>
          <button
            type="button"
            class="sheet__stepper-btn"
            :aria-label="$t('ai.detail.incrementParty')"
            :disabled="!needsPartyInput || partySize >= PARTY_MAX"
            @click="incrementParty"
          >
            +
          </button>
        </div>
        <p v-if="!needsPartyInput" class="sheet__party-lock-hint">{{ $t('ai.detail.partyLocked') }}</p>
      </div>
    </section>

    <section class="sheet__section">
      <div class="sheet__section-label">
        <span class="sheet__step-num">3</span>
        <span class="sheet__step-text">{{ $t('ai.detail.step3') }}</span>
        <span class="sheet__step-hint">{{ $t('ai.detail.step3hint') }}</span>
      </div>
      <div class="sheet__option-grid">
        <button
          v-for="item in mobilityOptions"
          :key="item.id"
          class="sheet__option-btn"
          :class="{ 'sheet__option-btn--active': mobilityMode === item.id }"
          @click="mobilityMode = item.id"
        >
          <component
            :is="item.icon"
            class="sheet__option-icon"
            :size="20"
            :stroke-width="mobilityMode === item.id ? 2.5 : 2.2"
            :color="item.color"
          />
          <span class="sheet__option-label">{{ $t(item.labelKey) }}</span>
        </button>
      </div>
    </section>

    <section class="sheet__section">
      <div class="sheet__section-label">
        <span class="sheet__step-num">4</span>
        <span class="sheet__step-text">{{ $t('ai.detail.step4') }}</span>
        <span class="sheet__step-hint">{{ $t('ai.detail.step4hint') }}</span>
      </div>
      <div class="sheet__option-grid sheet__option-grid--sim">
        <button
          v-for="item in simOptions"
          :key="item.id"
          class="sheet__option-btn"
          :class="{ 'sheet__option-btn--active': simOption === item.id }"
          @click="simOption = item.id"
        >
          <component
            :is="item.icon"
            class="sheet__option-icon"
            :size="20"
            :stroke-width="simOption === item.id ? 2.5 : 2.2"
            :color="item.color"
          />
          <span class="sheet__option-label">{{ $t(item.labelKey) }}</span>
        </button>
      </div>
    </section>

    <button type="button" class="sheet__submit sheet__submit--next" @click="goNextPage">
      <span class="sheet__submit-icon">
        <FileText :size="20" :stroke-width="2.4" color="#fff" />
      </span>
      {{ $t('ai.detail.nextStyle') }}
    </button>
    </div>

    <div v-show="detailPage === 2" class="detail-steps__page">
    <section class="sheet__section">
      <div class="sheet__section-label">
        <span class="sheet__step-num">5</span>
        <span class="sheet__step-text">{{ $t('ai.detail.step5') }}</span>
        <span class="sheet__step-hint">{{ $t('ai.detail.step5hint') }}</span>
      </div>
      <div class="sheet__persona-list">
        <button
          v-for="item in personaOptions"
          :key="item.id"
          type="button"
          class="sheet__persona-card"
          :class="{ 'sheet__persona-card--active': selectedPersonaId === item.id }"
          @click="selectedPersonaId = item.id"
        >
          <div class="sheet__persona-head">
            <strong>{{ $t(item.labelKey) }}</strong>
            <span class="sheet__persona-badge">{{
              $t('ai.persona.localBadge', { n: item.localDensity })
            }}</span>
          </div>
          <p>{{ $t(item.descriptionKey) }}</p>
        </button>
      </div>
    </section>

    <section class="sheet__section">
      <div class="sheet__section-label">
        <span class="sheet__step-num">6</span>
        <span class="sheet__step-text">{{ $t('ai.detail.step6') }}</span>
        <span
          class="sheet__interest-counter"
          :class="{ 'sheet__interest-counter--max': atMaxInterests }"
        >
          {{ interestCount }}<span style="color: #ccc">/3</span>
        </span>
      </div>
      <div class="sheet__interest-grid">
        <button
          v-for="item in interestOptions"
          :key="item.id"
          class="interest-btn"
          :class="{
            'interest-btn--active': interests.includes(item.id),
            'interest-btn--disabled': atMaxInterests && !interests.includes(item.id),
          }"
          :disabled="atMaxInterests && !interests.includes(item.id)"
          @click="toggleInterest(item.id)"
        >
          <component
            :is="item.icon"
            class="interest-btn__icon"
            :size="22"
            :stroke-width="interests.includes(item.id) ? 2.5 : 2.2"
            :color="item.color"
          />
          <span class="interest-btn__label">{{ $t(item.labelKey) }}</span>
          <span v-if="interests.includes(item.id)" class="interest-btn__check">✓</span>
        </button>
      </div>
    </section>

    <section class="sheet__section">
      <div class="sheet__section-label">
        <span class="sheet__step-num">7</span>
        <span class="sheet__step-text">{{ $t('ai.detail.step7') }}</span>
        <span class="sheet__step-hint">{{ $t('ai.detail.step7hint') }}</span>
      </div>
      <label class="sheet__field">
        <textarea
          v-model="specialRequest"
          class="sheet__textarea"
          maxlength="300"
          :placeholder="$t('ai.detail.textareaPlaceholder')"
          rows="3"
        />
        <span class="sheet__textarea-count">{{ specialRequest.length }}/300</span>
      </label>
    </section>

    <div class="detail-steps__actions">
      <button type="button" class="sheet__ghost" @click="goPrevPage">{{ $t('ai.detail.prev') }}</button>
      <button
        class="sheet__submit sheet__submit--split"
        :class="{ 'sheet__submit--disabled': !props.canProceedChat || props.isGeneratingCourse }"
        :disabled="!props.canProceedChat || props.isGeneratingCourse"
        @click="onProceedChat"
      >
        <span class="sheet__submit-icon">
          <FileText :size="20" :stroke-width="2.4" color="#fff" />
        </span>
        {{ props.isGeneratingCourse ? $t('ai.detail.generatingCourse') : $t('ai.detail.generateCourse') }}
      </button>
    </div>

    <p v-if="!props.canProceedChat" class="sheet__submit-hint">
      {{ $t('ai.detail.needStyleTheme') }}
    </p>
    </div>
  </div>
</template>

<style scoped>
.detail-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-steps__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-steps__tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border-radius: 14px;
  border: 2px solid #ebebeb;
  background: #fafaf8;
  font-size: 12px;
  font-weight: 700;
  color: #888;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}

.detail-steps__tab--active {
  border-color: #fe9c00;
  background: #fff8ec;
  color: #c97000;
}

.detail-steps__tab-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e8e8e8;
  color: #666;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-steps__tab--active .detail-steps__tab-num {
  background: #fe9c00;
  color: #fff;
}

.detail-steps__page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.detail-steps__actions {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px;
  align-items: stretch;
}

.sheet__ghost {
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #666;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  min-height: 52px;
  cursor: pointer;
}

.sheet__submit--next {
  margin-top: 4px;
}

.sheet__submit--split {
  margin: 0;
}

.sheet__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sheet__section-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sheet__step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fe9c00;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sheet__step-text {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.sheet__step-hint {
  font-size: 12px;
  color: #bbb;
  margin-left: auto;
}

.sheet__chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.sheet__chip-row::-webkit-scrollbar {
  display: none;
}

.sheet__field-label {
  font-size: 12px;
  font-weight: 700;
  color: #787878;
  margin: 0;
}

.sheet__interest-counter {
  margin-left: auto;
  font-size: 14px;
  font-weight: 800;
  color: #fe9c00;
}

.sheet__interest-counter--max {
  color: #ef4444;
}

.sheet__option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sheet__persona-list {
  display: grid;
  gap: 8px;
}

.sheet__persona-card {
  text-align: left;
  border: 2px solid #ebebeb;
  border-radius: 12px;
  background: #fafaf8;
  padding: 11px 12px;
  cursor: pointer;
}

.sheet__persona-card--active {
  border-color: #fe9c00;
  background: #fff8ec;
}

.sheet__persona-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sheet__persona-head strong {
  font-size: 13px;
  color: #1f2937;
  font-weight: 800;
}

.sheet__persona-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #c97000;
  background: #fff;
  border: 1px solid #f3d19f;
  border-radius: 999px;
  padding: 2px 7px;
}

.sheet__persona-card p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.sheet__option-grid--sim {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sheet__option-btn {
  border: 2px solid #ebebeb;
  border-radius: 12px;
  background: #fafaf8;
  color: #555;
  padding: 11px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.sheet__option-btn--active {
  border-color: #fe9c00;
  background: #fff8ec;
  color: #c97000;
}

.sheet__option-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.sheet__option-label {
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.sheet__interest-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.interest-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px 4px 10px;
  border-radius: 12px;
  border: 2px solid #ebebeb;
  background: #fafaf8;
  cursor: pointer;
}

.interest-btn--active {
  border-color: #fe9c00;
  background: #fff8ec;
}

.interest-btn--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.interest-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.interest-btn__label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  text-align: center;
}

.interest-btn__check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fe9c00;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.travel-type-btn {
  min-width: 84px;
  border: 2px solid #ebebeb;
  border-radius: 12px;
  background: #fafaf8;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.travel-type-btn--active {
  border-color: #fe9c00;
  background: #fff8ec;
}

.travel-type-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.travel-type-btn__label {
  font-size: 12px;
  font-weight: 700;
  color: #555;
}

.sheet__party-extra {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.sheet__stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  border: 2px solid #ebebeb;
  border-radius: 14px;
  background: #fafaf8;
  overflow: hidden;
  max-width: 220px;
}

.sheet__stepper-btn {
  flex: 0 0 48px;
  height: 48px;
  border: none;
  background: #fff;
  font-size: 22px;
  font-weight: 700;
  color: #fe9c00;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.sheet__stepper-btn:hover:not(:disabled) {
  background: #fff8ec;
}

.sheet__stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  color: #ccc;
}

.sheet__stepper-value {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  color: #1a1a1a;
  min-width: 72px;
}

.sheet__stepper--locked {
  opacity: 0.72;
}

.sheet__party-lock-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: #aaa;
  font-weight: 500;
}

.sheet__submit {
  width: 100%;
  padding: 17px;
  background: #fe9c00;
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 18px rgba(254, 156, 0, 0.4);
}

.sheet__submit--disabled {
  background: #e0e0e0;
  color: #aaa;
  box-shadow: none;
  cursor: not-allowed;
}

.sheet__submit-hint {
  text-align: center;
  font-size: 12px;
  color: #bbb;
  margin: -16px 0 0;
}

.sheet__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sheet__textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 80px;
  resize: vertical;
  border: 2px solid #ebebeb;
  border-radius: 12px;
  background: #fafaf8;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
  color: #333;
  outline: none;
}

.sheet__textarea:focus {
  border-color: #fe9c00;
  background: #fff8ec;
}

.sheet__textarea-count {
  align-self: flex-end;
  font-size: 11px;
  color: #b0b0b0;
  font-weight: 600;
}
</style>
