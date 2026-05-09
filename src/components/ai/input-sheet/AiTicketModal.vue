<script setup>
import { Plane } from 'lucide-vue-next'

const ticketBoardingPass = new URL(
  '../../../../asset/image-Photoroom (2).png',
  import.meta.url,
).href

const startDate = defineModel('startDate', { type: String, default: '' })
const endDate = defineModel('endDate', { type: String, default: '' })
const arrivalTime = defineModel('arrivalTime', { type: String, default: '' })
const departureTime = defineModel('departureTime', { type: String, default: '' })

defineProps({
  durationLabel: { type: String, default: '' },
  canProceedPrimary: { type: Boolean, default: false },
})

const emit = defineEmits(['next', 'focus-start-date', 'blur-start-date', 'blur-arrival', 'blur-departure'])

function onNext() {
  emit('next')
}
</script>

<template>
  <div class="ticket-modal" @click.stop>
    <div class="ticket-modal__pass">
      <img class="ticket-modal__img" :src="ticketBoardingPass" alt="" />
      <div class="ticket-modal__fields">
        <div class="ticket-modal__title-row">
          <p class="ticket-modal__title">
            {{ $t('ai.ticket.boardingPass') }}
            <span class="ticket-modal__title-sub">BOARDING PASS</span>
          </p>
          <span class="ticket-modal__flight-no">BTS-0724</span>
        </div>
        <div class="ticket-modal__route-row">
          <div class="ticket-modal__route-strip" aria-hidden="true">
            <span class="ticket-modal__airport-code">ICN</span>
            <Plane class="ticket-modal__route-plane" :size="11" :stroke-width="2.3" />
            <span class="ticket-modal__airport-code">GMP</span>
          </div>
          <span class="ticket-modal__route-duration">· {{ durationLabel || '-' }}</span>
        </div>
        <div class="ticket-modal__grid">
          <label class="ticket-modal__field">
            <span class="ticket-modal__label">{{ $t('ai.ticket.departDate') }}</span>
            <input
              v-model="startDate"
              class="ticket-modal__input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="done"
              placeholder="YYYY-MM-DD"
              maxlength="10"
              @focus="emit('focus-start-date')"
              @blur="emit('blur-start-date')"
            />
          </label>
          <label class="ticket-modal__field">
            <span class="ticket-modal__label">{{ $t('ai.ticket.arrivalTime') }}</span>
            <input
              v-model="arrivalTime"
              class="ticket-modal__input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="done"
              placeholder="HH:MM"
              maxlength="5"
              @blur="emit('blur-arrival')"
            />
          </label>
          <label class="ticket-modal__field">
            <span class="ticket-modal__label">{{ $t('ai.ticket.returnDate') }}</span>
            <input
              v-model="endDate"
              class="ticket-modal__input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="done"
              placeholder="YYYY-MM-DD"
              maxlength="10"
            />
          </label>
          <label class="ticket-modal__field">
            <span class="ticket-modal__label">{{ $t('ai.ticket.departTime') }}</span>
            <input
              v-model="departureTime"
              class="ticket-modal__input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              spellcheck="false"
              enterkeyhint="done"
              placeholder="HH:MM"
              maxlength="5"
              @blur="emit('blur-departure')"
            />
          </label>
        </div>
        <div class="ticket-modal__tearline" aria-hidden="true"></div>
      </div>
      <aside class="ticket-modal__brand-panel" aria-hidden="true">
        <Plane class="ticket-modal__brand-plane" :size="42" :stroke-width="2.1" />
        <div class="ticket-modal__brand-copy">
          <span class="ticket-modal__brand-bts">BTS</span>
          <span class="ticket-modal__brand-sub">Beyond Tours Seoul</span>
        </div>
      </aside>
    </div>
    <button
      class="ticket-modal__next"
      :class="{ 'ticket-modal__next--disabled': !canProceedPrimary }"
      type="button"
      :disabled="!canProceedPrimary"
      @click="onNext"
    >
      {{ $t('ai.ticket.nextBtn') }}
    </button>
  </div>
</template>

<style scoped>
.ticket-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 60%;
  flex-shrink: 0;
}

.ticket-modal__pass {
  position: relative;
  width: min(86vw, 450px);
  max-width: 100%;
}

.ticket-modal__img {
  width: 100%;
  height: auto;
  display: block;
}

.ticket-modal__fields {
  position: absolute;
  left: 17%;
  top: 24%;
  width: 47%;
  height: 54%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: auto;
  box-sizing: border-box;
}

.ticket-modal__title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: -0.01em;
}

.ticket-modal__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ticket-modal__title-sub {
  margin-left: 4px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.36);
}

.ticket-modal__flight-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.5);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.ticket-modal__route-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: rgba(0, 0, 0, 0.5);
}

.ticket-modal__route-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -1px;
}

.ticket-modal__airport-code {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.ticket-modal__route-plane {
  transform: rotate(4deg);
}

.ticket-modal__route-duration {
  position: absolute;
  right: 0;
  font-size: 8px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.42);
  letter-spacing: -0.01em;
}

.ticket-modal__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 12px;
  flex: 1;
  min-height: 0;
  align-content: start;
}

.ticket-modal__field {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ticket-modal__label {
  font-size: 10px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.48);
  letter-spacing: -0.02em;
}

.ticket-modal__input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 9px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 9px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.97);
  color: #1a1a1a;
  min-height: 34px;
}

.ticket-modal__input:focus {
  outline: none;
  border-color: #fe9c00;
}

.ticket-modal__tearline {
  height: 1px;
  margin: 1px 0 3px;
  background-image: repeating-linear-gradient(
    to right,
    rgba(0, 0, 0, 0.2) 0 4px,
    transparent 4px 7px
  );
}

.ticket-modal__brand-panel {
  position: absolute;
  right: 8%;
  top: 18%;
  width: 24%;
  height: 40%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fff;
}

.ticket-modal__brand-plane {
  opacity: 0.94;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.16));
}

.ticket-modal__brand-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.08;
  text-align: center;
}

.ticket-modal__brand-bts {
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.ticket-modal__brand-sub {
  margin-top: 2px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.92);
}

.ticket-modal__next {
  width: min(86vw, 440px);
  padding: 14px 20px;
  border: none;
  border-radius: 14px;
  background: #fe9c00;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(254, 156, 0, 0.35);
}

.ticket-modal__next--disabled,
.ticket-modal__next:disabled {
  background: #e0e0e0;
  color: #aaa;
  box-shadow: none;
  cursor: not-allowed;
}
</style>
