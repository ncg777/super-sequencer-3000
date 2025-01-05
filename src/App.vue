<template>
  <div id="app">
    <h1>Super Metronome 3000</h1>

    <div class="controls">
      <label>
        Tempo (BPM):
        <input type="number" v-model.number="bpm" min="30" max="300" />
      </label>
      <label>
        Multiplier:
        <input type="number" v-model.number="multiplier" min="1" />
      </label>
      <label>
        Divisor:
        <input type="number" v-model.number="divisor" min="1" />
      </label>
      <label>
        Soundwave:
        <select v-model="waveform" :change="onWaveChange">
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="triangle">Triangle</option>
          <option value="sawtooth">Sawtooth</option>
        </select>
      </label>
    </div>

    <div class="lists">
      <div>
        <h3>MIDI Notes</h3>
        <textarea v-model="midiNotesInput" placeholder="e.g. 60 64 67"></textarea>
      </div>
      <div>
        <h3>Numbers (will become bits)</h3>
        <textarea v-model="listOfNumbersInput" placeholder="e.g. 1 3 7"></textarea>
      </div>
    </div>

    <button @click="toggleMetronome">{{ isRunning ? 'Stop' : 'Start' }} Metronome</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import * as Tone from 'tone';

export default defineComponent({
  name: 'App',
  
  data() {
    return {
      bpm: 90,
      multiplier: 4,
      divisor: 4,
      waveform: "sawtooth",
      midiNotesInput: '72 73 76 78 80',
      listOfNumbersInput: '16 10 4 2 24 2 8 9',
      isRunning: false,
      synth: null as Tone.PolySynth | null,
      intervalId: null as number | null,
      counter: 0,
    };
  },
  computed: {
    onWaveChange(_: Event): void {
      if(this.isRunning) this.toggleMetronome().then(() => this.toggleMetronome());
    },
    midiNotes(): number[] {
      return this.midiNotesInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n) => !isNaN(n));
    },
    listOfNumbers(): number[] {
      return this.listOfNumbersInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n) => !isNaN(n));
    },
    totalCounters(): number {
      return this.multiplier * this.divisor;
    },
  },
  methods: {
    async toggleMetronome() {
      if (this.isRunning) {
        this.stopMetronome();
      } else {
        await Tone.start();
        this.startMetronome();
      }
    },
    async startMetronome() {
      await Tone.start(); // Start the audio context
      console.log('Audio context started');
      this.isRunning = true;
      this.counter = 0;
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: 
              this.waveform === "triangle" ? 'triangle' : 
                            this.waveform === "sawtooth" ? 'sawtooth' : 
                            this.waveform === "square" ? 'square' : 'sine'
        }}).toDestination();

      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      const calcDur = () => 15000/this.bpm;
      const l = () => {
        try {
          this.playNote(synth);
          this.counter = (this.counter + 1) % this.totalCounters; 
          this.intervalId = window.setTimeout(l, calcDur());
        } catch(ex) {
          console.error(ex);
        }
      };
      // Start interval for the metronome
      this.intervalId = window.setTimeout(l, calcDur());
      
      console.log('Metronome started');
    },
    stopMetronome() {
      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null; // Clear the interval reference
      }
      console.log('Metronome stopped');
    },
    playNote(synth:Tone.PolySynth) {
      // Ensure synth is initialized and context is running
      if (!synth) {
        console.warn("Synth is not initialized");
        return;
      }
      const n = this.listOfNumbers[this.counter % this.listOfNumbers.length];
      const bits = n.toString(2).padStart(this.midiNotes.length, '0');
      const notesToPlay = this.midiNotes
        .filter(
          (_, idx) => bits[bits.length - 1 - idx] == "1"
        )
        .map(midi => Tone.Frequency(midi, 'midi').toNote());
      const dur = 0.5*15.0/this.bpm;

      if (notesToPlay.length > 0 && synth) {
        const now = Tone.now();   
        for(let note of notesToPlay) {
          synth.triggerAttackRelease(
          note,
          dur+"s",
          now
        );
        }     
        
      }
    },
  },
  beforeUnmount() {
    this.stopMetronome(); // Ensure metronome stops when component unmounts
  },
});
</script>

<style scoped>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  padding: 20px;
}
.controls label,
.lists div {
  display: block;
  margin-bottom: 10px;
}
.controls input,
.controls select,
.lists textarea {
  width: 100%;
  padding: 5px;
  box-sizing: border-box;
}
.lists {
  margin-top: 20px;
  display: flex;
  gap: 20px;
}
.lists textarea {
  height: 80px;
}
button {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 16px;
}
</style>