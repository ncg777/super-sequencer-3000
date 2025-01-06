<template>
  <div id="app">
    <h1>Super Sequencer 3000</h1>
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
    <div class="controls">
      <div class="control-item">
        <label>
          Tempo (BPM):
          <input type="number" v-model.number="bpm" v-on:change="saveSettingsToLocalStorage" />
        </label>
      </div>
      <div class="control-item">
        <label>
          Numerator:
          <input type="number" v-model.number="numerator" min="1" v-on:change="saveSettingsToLocalStorage" />
        </label>
      </div>
      <div class="control-item">
        <label>
          Denominator:
          <input type="number" v-model.number="denominator" min="1" v-on:change="saveSettingsToLocalStorage" />
        </label>
      </div>
      <div class="control-item">
        <label>
          Octave shift:
          <input type="number" v-model.number="octave" v-on:change="saveSettingsToLocalStorage" />
        </label>
      </div>
      <div class="control-item">
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
      <div class="control-item">
        <button @click="toggleSequencer">{{ isRunning ? 'Stop' : 'Start' }}</button>
      </div>
    </div>

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
      denominator: localStorage["denominator"]?? 2,
      waveform: localStorage["waveform"]?? "sine",
      midiNotesInput: localStorage["midiNotesInput"] ?? '0 1 5 7 8',
      sequenceInput: localStorage["sequenceInput"] ?? '10 4 8 1 17 4 2 1',
      octave: localStorage["octave"] ?? 7,
      isRunning: false,
      synth: null as Tone.PolySynth | null,
      loop: null as Tone.Loop|null,
      counter: 0,
    };
  },
  computed: {
    interval() {return (this.numerator*this.denominator)+"n";},
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
              (_, idx) => bits[idx] == "1"
            ).map((k) => k+(this.octave*12));
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
      
      midi.header.keySignatures= [this.numerator,this.denominator];
      this.actualNotes.forEach(
        (notes, index) => {
        notes.forEach((note:number) => {
                track.addNote({
                  midi: note,
                  time: 2.0*index/(this.numerator*this.denominator),
                  duration: 1.0/(this.denominator)
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
      this.saveSettingsToLocalStorage();
      const that = this;
      if(this.loop == null) {
        this.loop = new Tone.Loop(function(_) {
          that.playNote(synth, Tone.now());
          that.counter = (that.counter + 1) % that.actualNotes.length; 
        }, that.interval);
      }
      
      this.loop.start(0);

      Tone.getTransport().start();  
      
      console.log('Started');
    },
    stopSequencer() {
      if(!this.isRunning) return;
      this.isRunning = false;
      this.loop?.stop();
      Tone.getTransport().stop();
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
        this.loop.interval=this.interval;
      }
      Tone.getTransport().bpm.value = this.bpm;
      Tone.getTransport().timeSignature = [this.numerator,this.denominator];
    },
    
    async playNote(synth:Tone.PolySynth, when:Tone.Unit.Time) {
      if (!synth) {
        console.warn("Synth is not initialized");
        return;
      }
      synth.set({envelope:{
        attackCurve: 'exponential',
        attack: (this.denominator*32)+"n",
        decay:0,
        releaseCurve: 'exponential',
        release: (this.denominator*8)+"n",
        sustain: 1.0
      },
      oscillator: {
              type: 
                this.waveform === "triangle" ? 'triangle' : 
                              this.waveform === "sawtooth" ? 'sawtooth' : 
                              this.waveform === "square" ? 'square' : 'sine1'
          }});
      
      if (this.actualNotes[this.counter%this.actualNotes.length].length > 0 && synth) {
        for(let note of this.actualNotes[this.counter%this.actualNotes.length]) {
          synth.triggerAttackRelease(
          Tone.Frequency(note, 'midi').toFrequency(),
          (this.denominator*this.numerator*2)+"n",
          when,
          0.333
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
      a.download = `super-sequencer-3000-sig${this.numerator}on${this.denominator}-${this.bpm}bpm-${this.formattedDate.toString()}.mid`;
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
  background-color: #000000; /* Dark background */
  color: #00ff00; /* Light text color */
  display: flex;
  flex-direction: column;
  padding: 5px;
  height: 100vh;
  max-width: 800px;
  margin:auto;
}
h1, h2, h3, h4 {
  margin-top: 2px;
  margin-bottom: 2px;
  padding:0;
}
.controls {
  display: grid; /* Use grid layout for controls */
  grid-template-columns: repeat(3, 1fr); /* 3 columns */
  grid-template-rows: repeat(2, auto); /* 2 rows */
  gap: 0px; /* Space between items */
  margin-bottom: 0px; /* Space below controls */
}

.control-item {
  display: flex;
  flex-direction: column;
  text-align: end;
  padding:3px;
}
.control-item input {
  max-width: 120px;
}
/* Other existing styles */
.lists {
  overflow-y: auto;
}

.lists {
  display: grid; /* Use grid for the lists */
  gap: 0px; /* Space between items */
}
.lists textarea {
  width:99%;
}

button {
  padding: 3px;
  font-size: 12px; 
  border-radius: 5px;
  background-color: darkgrey;
  color: #00ff00; /* White text */
  cursor: pointer; /* Pointer cursor */
  transition: background-color 0.3s ease; /* Smooth transition */
  width: 100%; /* Full width for buttons */
}

/* Other styles remain unchanged... */
</style>