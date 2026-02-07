<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'

/**
 * <AdjacencyMatrix />
 * ------------------------------------------------------
 * WebGL heatmap for polyphonic MIDI adjacency
 *
 * Props:
 *  - notes: number[]        // active notes at current tick
 *  - decay?: number         // visual decay factor per frame
 *  - flowWeight?: number    // S_{t-1} -> S_t weight
 *  - harmonyWeight?: number // within S_t weight
 */

const props = withDefaults(defineProps<{
  notes: number[]
  decay?: number
  flowWeight?: number
  harmonyWeight?: number
  size?: number
  minNote?: number
  maxNote?: number
}>(), {
  decay: 0.93,
  flowWeight: 0.5,
  harmonyWeight: 0.25,
  size: 256,
  minNote: 0,
  maxNote: 127,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let texture: WebGLTexture | null = null
let buffer: WebGLBuffer | null = null

let matrix: Float32Array
let previousNotes: number[] = []
let rafId = 0
let SIZE = 128

// -----------------------------------------------------------------------------
// Math
// -----------------------------------------------------------------------------
function noteToIndex(note: number): number {
  const range = props.maxNote - props.minNote + 1
  const mapped = Math.floor((note - props.minNote) * SIZE / range)
  return Math.max(0, Math.min(SIZE - 1, mapped))
}

function idx(noteI: number, noteJ: number) {
  const i = noteToIndex(noteI)
  const j = noteToIndex(noteJ)
  return i * SIZE + j
}

function resetMatrix() {
  SIZE = props.size
  matrix = new Float32Array(SIZE * SIZE)
  previousNotes = []
}

function clampNote(n: number) {
  return Math.max(0, Math.min(127, n | 0))
}

function applyAdjacency(prev: number[], curr: number[]) {
  // Temporal adjacency (flow)
  for (let i = 0; i < prev.length; i++) {
    const p = clampNote(prev[i])
    for (let j = 0; j < curr.length; j++) {
      const c = clampNote(curr[j])
      const index = idx(p, c)
      matrix[index] += props.flowWeight
    }
  }

  // Simultaneous adjacency (harmony)
  for (let i = 0; i < curr.length; i++) {
    const a = clampNote(curr[i])
    for (let j = 0; j < curr.length; j++) {
      const b = clampNote(curr[j])
      const index = idx(a, b)
      matrix[index] += props.harmonyWeight
    }
  }
}

// -----------------------------------------------------------------------------
// WebGL
// -----------------------------------------------------------------------------
function createShader(type: number, src: string) {
  const s = gl!.createShader(type)!
  gl!.shaderSource(s, src)
  gl!.compileShader(s)
  if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
    console.error('Shader error:', gl!.getShaderInfoLog(s))
    throw new Error(gl!.getShaderInfoLog(s) || 'shader error')
  }
  return s
}

function initGL() {
  resetMatrix()
  console.log('Initializing WebGL with SIZE:', SIZE)
  
  const canvas = canvasRef.value!
  gl = canvas.getContext('webgl', { 
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false
  })
  
  if (!gl) {
    console.error('WebGL not supported')
    return
  }

  const vs = createShader(gl.VERTEX_SHADER, `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `)

  const fs = createShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    uniform sampler2D u_tex;
    uniform vec2 u_px;
    varying vec2 v_uv;

    vec3 ramp(float t) {
      t = pow(t, 0.5); // Gamma correction for brightness
      vec3 a = vec3(0.0, 0.0, 0.1);
      vec3 b = vec3(0.0, 0.8, 1.0);
      vec3 c = vec3(1.0, 1.0, 0.5);
      vec3 d = vec3(1.0);
      if (t < 0.33) return mix(a, b, t * 3.0);
      if (t < 0.66) return mix(b, c, (t - 0.33) * 3.0);
      return mix(c, d, (t - 0.66) * 3.0);
    }

    void main() {
      // Large gaussian-like blur for disk effect
      float v = 0.0;
      float total = 0.0;
      
      for (float y = -4.0; y <= 4.0; y += 1.0) {
        for (float x = -4.0; x <= 4.0; x += 1.0) {
          vec2 offset = vec2(x, y) * u_px;
          float dist = length(vec2(x, y));
          float weight = exp(-dist * dist * 0.15);
          v += texture2D(u_tex, v_uv + offset).r * weight;
          total += weight;
        }
      }
      
      v = v / total;
      v = clamp(v, 0.0, 1.0);
      gl_FragColor = vec4(ramp(v), 1.0);
    }
  `)

  program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return
  }
  
  gl.useProgram(program)

  buffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]),
    gl.STATIC_DRAW
  )

  const loc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  // Initialize with empty byte array
  const byteMatrix = new Uint8Array(SIZE * SIZE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    SIZE,
    SIZE,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    byteMatrix
  )

  gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0)
  gl.uniform2f(
    gl.getUniformLocation(program, 'u_px'),
    1 / SIZE,
    1 / SIZE
  )
  
  gl.viewport(0, 0, SIZE, SIZE)
  gl.clearColor(0.0, 0.0, 0.0, 1.0)
  
  console.log('WebGL initialized successfully')
}

function draw() {
  if (!gl || !texture || !program) {
    return
  }
  
  // Apply decay
  for (let i = 0; i < matrix.length; i++) {
    matrix[i] *= props.decay
  }

  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  
  // Convert float matrix to byte array
  const byteMatrix = new Uint8Array(SIZE * SIZE)
  for (let i = 0; i < matrix.length; i++) {
    const val = Math.min(255, Math.floor(matrix[i] * 100)) // Boost by 100x
    byteMatrix[i] = val
  }
  
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    SIZE,
    SIZE,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    byteMatrix
  )

  gl.drawArrays(gl.TRIANGLES, 0, 6)
  rafId = requestAnimationFrame(draw)
}

// -----------------------------------------------------------------------------
// Scheduler hook
// -----------------------------------------------------------------------------
watch(
  () => props.notes,
  (now) => {
    console.log('AdjacencyMatrix: notes updated', now)
    if (now && now.length > 0) {
      applyAdjacency(previousNotes, now)
      previousNotes = [...now]
    }
  },
  { deep: true }
)

onMounted(() => {
  console.log('AdjacencyMatrix: mounted')
  try {
    initGL()
    if (gl) {
      draw()
    }
  } catch (error) {
    console.error('Failed to initialize WebGL:', error)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="adjacency-wrapper">
    <canvas ref="canvasRef" :width="size" :height="size" />
  </div>
</template>

<style scoped>
.adjacency-wrapper {
  width: 100%;
  height: 100%;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
