<template>
  <div id="app">
    <h1>Super Sequencer 3000</h1>

    <div class="controls">
      <label>
        Tempo (BPM):
        <input type="number" v-model.number="bpm" />
      </label>
      <label>
        Numerator:
        <input type="number" v-model.number="numerator" min="1" />
      </label>
      <label>
        Denominator:
        <input type="number" v-model.number="denominator" min="1" />
      </label>
      <label>
        Soundwave:
        <select v-model="waveform" v-on:change="onWaveChange">
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="triangle">Triangle</option>
          <option value="sawtooth">Sawtooth</option>
        </select>
      </label>
    </div>

    <div class="lists">
      <div>
        <h3>Numbers (converted to binary)</h3>
        <textarea v-model="listOfNumbersInput" placeholder="e.g. 1 3 7"></textarea>
      </div>
      <div>
        <h3>MIDI Notes (mapped to bit indexes)</h3>
        <textarea v-model="midiNotesInput" placeholder="e.g. 60 64 67"></textarea>
      </div>
    </div>

    <button @click="toggleMetronome">{{ isRunning ? 'Stop' : 'Start' }} Metronome</button>
    <button @click="downloadMIDI">Download MIDI</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

export default defineComponent({
  name: 'App',
  
  data() {
    return {
      bpm: localStorage["bpm"] ?? 90,
      numerator: localStorage["numerator"]?? 4,
      denominator: localStorage["denominator"]?? 4,
      waveform: localStorage["waveform"]?? "sawtooth",
      midiNotesInput: localStorage["midiNotesInput"] ?? '72 73 76 78 80',
      listOfNumbersInput: localStorage["listOfNumbersInput"] ?? '16 10 4 2 24 2 8 9',
      isRunning: false,
      synth: null as Tone.PolySynth | null,
      intervalId: null as number | null,
      counter: 0,
    };
  },
  computed: {
    midiNotes(): number[] {
      return this.midiNotesInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },
    listOfNumbers(): number[] {
      return this.listOfNumbersInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },

    actualNotes():number[][] {
      return this.listOfNumbers.map(
        (n:number) => {
          const bits = n.toString(2).padStart(this.midiNotes.length, '0');
          return this.midiNotes
            .filter(
              (_, idx) => bits[bits.length - 1 - idx] == "1"
            );
            
        });
    },
    totalCounters(): number {
      return this.actualNotes.length;
    },
    formattedDate() {
      return (timestamp => `${new Date(timestamp).getUTCFullYear()}${String(new Date(timestamp).getUTCMonth() + 1).padStart(2, '0')}${String(new Date(timestamp).getUTCDate()).padStart(2, '0')}T${String(new Date(timestamp).getUTCHours()).padStart(2, '0')}${String(new Date(timestamp).getUTCMinutes()).padStart(2, '0')}${String(new Date(timestamp).getUTCSeconds()).padStart(2, '0')}Z`)(Date.now());
    },
  },
  methods: {
    async onWaveChange(_ : Event){
      if(this.isRunning) this.toggleMetronome().then(() => this.toggleMetronome());
    },
    async getMidi():Promise<Midi> {
      const midi = new Midi();
      const track = midi.addTrack();
      midi.header.setTempo(this.bpm);

      this.actualNotes.forEach(
        (notes, index) => {
        notes.forEach((note:number) => {
                track.addNote({
                  midi: note,
                  time: (15/this.bpm)*index,
                  duration: (15/this.bpm)
                });
              })
      
        
      });
      return midi;
    },
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
          this.intervalId = window.setTimeout(l, calcDur());
          this.playNote(synth);
          this.counter = (this.counter + 1) % this.totalCounters; 
          
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
    saveSettingsToLocalStorage() {
      localStorage["bpm"] = this.bpm;
      localStorage["numerator"] =this.numerator;
      localStorage["denominator"] = this.denominator;
      localStorage["waveform"] = this.waveform;
      localStorage["midiNotesInput"] =this.midiNotesInput;
      localStorage["listOfNumbersInput"]=this.listOfNumbersInput;

    },
    playNote(synth:Tone.PolySynth) {
      this.saveSettingsToLocalStorage();
      // Ensure synth is initialized and context is running
      if (!synth) {
        console.warn("Synth is not initialized");
        return;
      }
      
      const dur = 0.5*15.0/this.bpm;

      if (this.actualNotes[this.counter%this.actualNotes.length].length > 0 && synth) {
        const now = Tone.now();
        let notes = this.actualNotes[this.counter%this.actualNotes.length];
        for(let note of notes) {
          synth.triggerAttackRelease(
            Tone.Frequency(note, 'midi').toFrequency(),
            dur+"s",
            now
          );
        }
      }
    },

    async downloadMIDI() {
      const data = (await this.getMidi()).toArray();
      const blob = new Blob([data], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'super-metronome-3000-bpm' + this.bpm+ "-" + this.formattedDate.toString() + '.mid';
      a.click();

      // Clean up the URL object
      URL.revokeObjectURL(url);
    }
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
  background-color: #121212; /* Dark background */
  color: #ffffff; /* Light text color */
  min-height: 100vh; /* Fill the viewport height */
  display: flex; /* Use flexbox for alignment */
  flex-direction: column; /* Stack elements vertically */
}

.controls, .lists {
  margin-bottom: 20px; /* Add margin between sections */
}

.controls label,
.lists div {
  display: block;
  margin-bottom: 10px;
  color: #ffffff; /* Ensure label text is white */
}

.controls input,
.controls select,
.lists textarea {
  width: 100%;
  padding: 12px; /* Increased padding for a fancier look */
  box-sizing: border-box;
  border: 1px solid #444; /* Dark border */
  border-radius: 5px; /* Slightly rounded corners */
  background-color: #1e1e1e; /* Darker input background */
  color: #ffffff; /* Light text color in inputs */
}

.controls input:focus,
.controls select:focus,
.lists textarea:focus {
  outline: none; /* Remove outline */
  border-color: #bb86fc; /* Purple border on focus */
  background-color: #2e2e2e; /* Slightly highlighted input */
}

.lists {
  display: grid; /* Use grid for the lists */
  gap: 20px; /* Space between items */
}

.lists textarea {
  height: 100px; /* Adjustable height */
  resize: none; /* Disable resizing */
}

button {
  margin-top: 20px;
  padding: 12px; /* Increase padding for better touch target size */
  font-size: 16px;
  border: none; /* Remove default border */
  border-radius: 5px; /* Rounded corners */
  background-color: #bb86fc; /* Purple background */
  color: #ffffff; /* White text */
  cursor: pointer; /* Pointer cursor */
  transition: background-color 0.3s ease; /* Smooth transition */
  width: 100%; /* Full width for buttons */
}

button:hover {
  background-color: #9b66dd; /* Slightly darker purple on hover */
}

button:disabled {
  background-color: #444; /* Darker button when disabled */
  cursor: not-allowed; /* Not-allowed cursor */
}

/* Media Queries for Mobile Responsiveness */
@media (max-width: 600px) {
  #app {
    padding: 10px; /* Reduce padding on small screens */
  }

  button {
    font-size: 18px; /* Increase button text size on mobile */
  }

  .controls input,
  .controls select,
  .lists textarea {
    padding: 10px; /* Adjust padding for inputs on mobile */
  }
}
</style>