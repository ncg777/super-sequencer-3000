<template>
  <div id="app">
    <h1>Super Sequencer 3000</h1>

    <div class="controls">
      <label>
        Tempo (BPM):
        <input type="number" v-model.number="bpm" v-on:change="saveSettingsToLocalStorage" />
      </label>
      <label>
        Numerator:
        <input type="number" v-model.number="numerator" min="1" v-on:change="saveSettingsToLocalStorage" />
      </label>
      <label>
        Denominator:
        <input type="number" v-model.number="denominator" min="1" v-on:change="saveSettingsToLocalStorage" />
      </label>
      <label>
        Octave shift:
        <input type="number" v-model.number="octave" v-on:change="saveSettingsToLocalStorage" />
      </label>
      <label>
        Soundwave:
        <select v-model="waveform" v-on:change="saveSettingsToLocalStorage">
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="triangle">Triangle</option>
          <option value="sawtooth">Sawtooth</option>
        </select>
      </label>
    </div>

    <div class="lists">
      <div>
        <h3>Sequence (converted to binary)</h3>
        <textarea v-model="sequenceInput" placeholder="e.g. 1 3 7" v-on:change="saveSettingsToLocalStorage"></textarea>
      </div>
      <div>
        <h3>MIDI Notes (mapped to bit indexes)</h3>
        <textarea v-model="midiNotesInput" placeholder="e.g. 60 64 67" v-on:change="saveSettingsToLocalStorage"></textarea>
      </div>
    </div>

    <button @click="toggleSequencer">{{ isRunning ? 'Stop' : 'Start' }}</button>
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
      waveform: localStorage["waveform"]?? "square",
      midiNotesInput: localStorage["midiNotesInput"] ?? '0 1 5 7 8',
      sequenceInput: localStorage["sequenceInput"] ?? '18 8 4 2 1 2 4 8 20 8 4 2 9 2 4 8',
      octave: localStorage["octave"] ?? 5,
      isRunning: false,
      synth: null as Tone.PolySynth | null,
      loop: null as Tone.Loop|null,
      counter: 0,
    };
  },
  computed: {
    dur():number {
      return 240/(this.denominator*this.numerator*this.bpm);
    },
    midiNotes(): number[] {
      return this.midiNotesInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },
    sequence(): number[] {
      return this.sequenceInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },

    actualNotes():number[][] {
      return this.sequence.map(
        (n:number) => {
          const bits = n.toString(2).padStart(this.midiNotes.length, '0');
          return this.midiNotes
            .filter(
              (_, idx) => bits[bits.length - 1 - idx] == "1"
            ).map((n) => n+this.octave*12);
            
        });
    },
    formattedDate() {
      return (timestamp => `${new Date(timestamp).getUTCFullYear()}${String(new Date(timestamp).getUTCMonth() + 1).padStart(2, '0')}${String(new Date(timestamp).getUTCDate()).padStart(2, '0')}T${String(new Date(timestamp).getUTCHours()).padStart(2, '0')}${String(new Date(timestamp).getUTCMinutes()).padStart(2, '0')}${String(new Date(timestamp).getUTCSeconds()).padStart(2, '0')}Z`)(Date.now());
    },
  },
  methods: {
    async getMidi():Promise<Midi> {
      const midi = new Midi();
      const track = midi.addTrack();
      
      this.actualNotes.forEach(
        (notes, index) => {
        notes.forEach((note:number) => {
                track.addNote({
                  midi: note,
                  time: 0.5*index/this.denominator,
                  duration: 0.5/this.denominator
                });
              })
      });
      midi.header.setTempo(this.bpm);
      return midi;
    },
    async toggleSequencer() {
      if (this.isRunning) {
        this.stopSequencer();
      } else {
        this.startSequencer();
      }
    },

    async startSequencer() {
      if(this.isRunning) return;
      this.isRunning = true;
      this.counter = 0;
      await Tone.start();
      console.log('Audio context started');
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      const that = this;
      if(this.loop == null) {
        this.loop = new Tone.Loop(function(_) {
          that.playNote(synth);
          that.counter = (that.counter + 1) % that.actualNotes.length; 
        }, that.denominator+"n");
      }
      this.loop.start(0);

      Tone.getTransport().start();  
      
      console.log('Started');
    },
    stopSequencer() {
      if(!this.isRunning) return;
      this.isRunning = false;
      this.loop?.stop();
      
      console.log('Stopped');
    },
    saveSettingsToLocalStorage() {
      localStorage["bpm"] = this.bpm;
      localStorage["numerator"] =this.numerator;
      localStorage["denominator"] = this.denominator;
      localStorage["octave"] =this.octave;
      localStorage["waveform"] = this.waveform;
      localStorage["midiNotesInput"] =this.midiNotesInput;
      localStorage["sequenceInput"]=this.sequenceInput;
      if(!!this.loop){
        this.loop.interval=this.denominator+"n";
      }
      Tone.getTransport().bpm.value = this.bpm;
      Tone.getTransport().timeSignature = [this.numerator,this.denominator];
    },
    
    async playNote(synth:Tone.PolySynth) {
      if (!synth) {
        console.warn("Synth is not initialized");
        return;
      }
      synth.set({envelope:{
        attackCurve: 'exponential',
        attack: 0.001,
        decayCurve: 'exponential',
        decay: this.denominator+"n",
        sustain: 0
      },
      oscillator: {
              type: 
                this.waveform === "triangle" ? 'triangle' : 
                              this.waveform === "sawtooth" ? 'sawtooth' : 
                              this.waveform === "square" ? 'square' : 'sine'
          }});
      
      if (this.actualNotes[this.counter%this.actualNotes.length].length > 0 && synth) {
        const now = Tone.now();
        let notes = this.actualNotes[this.counter%this.actualNotes.length];
        for(let note of notes) {
          synth.triggerAttackRelease(
            Tone.Frequency(note, 'midi').toFrequency(),
            this.denominator+"n",
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
      a.download = `super-sequencer-3000-t${this.numerator}-${this.denominator}-bpm-${this.bpm}-${this.formattedDate.toString()}.mid`;
      a.click();

      // Clean up the URL object
      URL.revokeObjectURL(url);
    }
  },
  
  beforeUnmount() {
    this.stopSequencer(); // Ensure metronome stops when component unmounts
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
  padding: 5px; 
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
  gap: 5px; /* Space between items */
}

.lists textarea {
  height: 4em; /* Adjustable height */
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
    padding: 5px;
  }
}
</style>