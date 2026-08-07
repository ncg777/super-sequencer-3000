<template>
  <div class="time-warp-preview">
    <svg viewBox="0 0 240 140" class="time-warp-preview-svg" role="img" aria-label="Time warp curve preview">
      <rect x="0" y="0" width="240" height="140" class="time-warp-preview-bg" />
      <path :d="identityPath" class="time-warp-preview-identity" />
      <path :d="curvePath" class="time-warp-preview-curve" />
      <circle
        v-for="tick in stepTicks"
        :key="tick.key"
        :cx="tick.x"
        :cy="tick.y"
        r="2"
        class="time-warp-preview-tick"
      />
    </svg>
    <p v-if="resolution.error" class="time-warp-preview-error">{{ resolution.error }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  resolveTimeWarpFunction,
  sampleWarpCurve,
  warpNormalizedTime,
} from '../audio/timeWarp';

export default defineComponent({
  name: 'TimeWarpPreview',
  props: {
    curve: {
      type: String,
      required: true,
    },
    expression: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    steps: {
      type: Number,
      default: 8,
    },
  },
  computed: {
    resolution() {
      return resolveTimeWarpFunction(this.curve, this.expression);
    },
    amountMix(): number {
      return Math.max(0, Math.min(1, this.amount / 100));
    },
    samples(): number[] {
      return sampleWarpCurve(this.resolution.fn, this.amountMix, 120);
    },
    identityPath(): string {
      return 'M 0 140 L 240 0';
    },
    curvePath(): string {
      const points: string[] = [];
      for (let index = 0; index < this.samples.length; index += 1) {
        const x = (index / (this.samples.length - 1)) * 240;
        const y = 140 - this.samples[index] * 140;
        points.push(`${index === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`);
      }
      return points.join(' ');
    },
    stepTicks(): Array<{ key: string; x: number; y: number }> {
      const safeSteps = Math.max(1, Math.floor(this.steps));
      const ticks: Array<{ key: string; x: number; y: number }> = [];
      for (let step = 0; step < safeSteps; step += 1) {
        const t = step / safeSteps;
        const warped = warpNormalizedTime(t, this.resolution.fn, this.amountMix);
        ticks.push({
          key: `${step}-${warped.toFixed(5)}`,
          x: t * 240,
          y: 140 - warped * 140,
        });
      }
      return ticks;
    },
  },
});
</script>

<style scoped>
.time-warp-preview {
  border: 1px solid rgba(127, 211, 231, 0.26);
  background: rgba(3, 11, 16, 0.62);
  padding: 8px;
}

.time-warp-preview-svg {
  width: 100%;
  height: auto;
  display: block;
}

.time-warp-preview-bg {
  fill: #000000;
}

.time-warp-preview-identity {
  fill: none;
  stroke: rgba(151, 197, 210, 0.6);
  stroke-dasharray: 4 4;
  stroke-width: 1;
}

.time-warp-preview-curve {
  fill: none;
  stroke: #00ffd1;
  stroke-width: 2;
}

.time-warp-preview-tick {
  fill: #d6f6ff;
}

.time-warp-preview-error {
  margin: 8px 0 0;
  color: #ff9ea8;
  font-size: 12px;
}
</style>
