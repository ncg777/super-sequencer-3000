<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number;
  label: string;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
}>(), {
  step: 1,
  disabled: false,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void;
}>();

const isEditing = ref(false);
const manualValue = ref('');
const manualInputRef = ref<any>(null);

const stepDecimals = computed(() => {
  const raw = String(props.step);
  const dotIndex = raw.indexOf('.');
  return dotIndex >= 0 ? raw.length - dotIndex - 1 : 0;
});

function normalizeValue(value: number): number {
  const clamped = Math.max(props.min, Math.min(props.max, value));
  const step = Number(props.step);

  if (!Number.isFinite(step) || step <= 0) {
    return clamped;
  }

  const snapped = props.min + Math.round((clamped - props.min) / step) * step;
  return Number(snapped.toFixed(stepDecimals.value));
}

function beginManualEdit(): void {
  if (props.disabled) {
    return;
  }
  manualValue.value = String(props.modelValue);
  isEditing.value = true;

  void nextTick(() => {
    const input = manualInputRef.value?.$el?.querySelector('input') as HTMLInputElement | null;
    input?.focus();
    input?.select();
  });
}

function commitManualEdit(): void {
  const parsed = Number.parseFloat(manualValue.value);
  if (!Number.isNaN(parsed)) {
    emit('update:modelValue', normalizeValue(parsed));
  }

  isEditing.value = false;
}

function cancelManualEdit(): void {
  isEditing.value = false;
}

function updateFromSlider(nextValue: unknown): void {
  const numericValue = typeof nextValue === 'number' ? nextValue : Number(nextValue);
  if (Number.isNaN(numericValue)) {
    return;
  }

  emit('update:modelValue', normalizeValue(numericValue));
}
</script>

<template>
  <div class="editable-slider" :class="{ 'editable-slider--disabled': disabled }">
    <div class="editable-slider__header">
      <button
        type="button"
        class="editable-slider__label"
        :disabled="disabled"
        @click="beginManualEdit"
        @touchstart.prevent="beginManualEdit"
      >
        {{ label }}
      </button>
      <v-text-field
        v-if="isEditing"
        ref="manualInputRef"
        v-model="manualValue"
        class="editable-slider__input"
        type="number"
        density="compact"
        variant="underlined"
        hide-details
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        @keydown.enter.prevent="commitManualEdit"
        @keydown.esc.prevent="cancelManualEdit"
        @blur="commitManualEdit"
      />
    </div>

    <v-slider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      hide-details
      @update:modelValue="updateFromSlider"
    />
  </div>
</template>

<style scoped>
.editable-slider--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.editable-slider__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 20px;
}

.editable-slider__label {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.82rem;
  background: transparent;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.editable-slider__label:hover,
.editable-slider__label:focus-visible {
  text-decoration: underline;
  outline: none;
}

.editable-slider__input {
  max-width: 140px;
}

.editable-slider :deep(.v-slider) {
  margin-top: -8px;
  margin-bottom: -14px;
}

.editable-slider :deep(.v-slider-track) {
  height: 4px !important;
}

.editable-slider :deep(.v-slider-thumb) {
  --v-slider-thumb-size: 14px;
}
</style>
