<template>  
	<v-app>
		<v-main>
		  <v-responsive class="align-centerfill-height mx-auto" max-width="900">
			<h1>Super Sequencer 3k</h1>
			<v-row>
        <v-col cols="6">
          <v-autocomplete
            label="Forte number"
            v-model="forte"
            :items="allChords"
            placeholder="Forte number..."
            @update:modelValue="saveSettingsToLocalStorage"
          />
				</v-col>
        <v-col cols="6">
          <v-select v-model="waveform" label="Waveform" :items="['sine','square','triangle','sawtooth']" @update:modelValue="saveSettingsToLocalStorage" />
			  </v-col>
			</v-row>
      <v-row>
        <v-col cols="12">
				  <v-text-field 
            label="Sequence (converted to binary)" 
            v-model="sequenceInput" 
            placeholder="e.g. 1 3 7" 
            @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
			<v-row>
			  <v-col cols="12">
          <v-slider :label="'Tempo (' + bpm + 'BPM)'" min=1 step=1 max=499 v-model.number="bpm" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
      <v-row>
        <v-col colr="12">
          <v-slider :label="'Numerator (' + numerator + ')'" min=1 step=1 max=16 v-model.number="numerator" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
      <v-row>
			  <v-col cols="12">
				  <v-slider :label="'Denominator ('+ denominator + ')'" min=1 step=1 max=16 v-model.number="denominator" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
			</v-row>
      <v-row>
        <v-col cols="12">
				  <v-slider :label="'Octave shift ('+ octave + ')'" min=0 step=1 max=10 v-model.number="octave" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
			<button @click="toggleSequencer" class="stopplay">{{ isRunning ? '⏹️' : '▶️' }}</button>
			<button @click="downloadMIDI">Download MIDI</button>
		  </v-responsive>
      </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { PCS12 } from './objects/PCS12';

export default defineComponent({
  name: 'App',
  data() {
    return {
      bpm: parseInt(localStorage["bpm"]?? "90") ,
      numerator: parseInt(localStorage["numerator"]?? "4"),
      denominator: parseInt(localStorage["denominator"] ?? "5"),
      waveform: localStorage["waveform"] ?? "sine",
      sequenceInput: localStorage["sequenceInput"] ?? '1 2 4 8 16',
      octave: parseInt(localStorage["octave"] ?? "6"),
      allChords: [] as string[],
      isRunning: false,
      loop: null as Tone.Loop|null,
      forte: localStorage["forte"] ?? "5-35.05",
      counter: 0,
    };
  },
  computed: {
    synth():Tone.PolySynth {
        return new Tone.PolySynth(Tone.Synth,{
          envelope:{
            attackCurve: 'exponential',
            attack: (this.denominator*this.numerator*8)+"n",
            decay:0,
            releaseCurve: 'exponential',
            release: (this.denominator*this.numerator*2)+"n",
            sustain: 1.0
          },
          oscillator: {
                type: 
                  this.waveform === "triangle" ? 'triangle' : 
                    this.waveform === "sawtooth" ? 'sawtooth' : 
                      this.waveform === "square" ? 'square' : 'sine1'
          }
        }).toDestination();
    },
    interval() {return (this.numerator*this.denominator)+"n";},
    sequence(): number[] {
      return this.sequenceInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },
    scale(): number[] {
      const p = PCS12.parseForte(this.forte)?.asSequence()||[];
      const o = [];
      
      for(const i of p) {
        for(let j=(i+this.octave*12);j<128;j+=12) {
          o.push(j);
        }
      }
      o.sort((a,b) => a-b);
      return o; 
    },
    actualNotes():number[][] {
      return this.sequence.map(
        (n:number) => {
          const bits = n.toString(2).split('').reverse();
          return this.scale
            .filter(
              (_, idx) => idx < bits.length && bits[idx] == "1"
            );
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
      
      midi.header.setTempo(this.bpm);
      for(let i=0;i < this.actualNotes.length;i++) {
        const notes = this.actualNotes[i];
        const vel = 64*Math.sqrt(1.0/notes.length);
        const quant = 240.0/(this.numerator*this.denominator*this.bpm);
        for(let note of notes) {
          track.addNote({
            midi: note,
            time: i*quant,
            duration: quant/2.0,
            velocity: vel 
          });
        };
      }
      
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
      this.saveSettingsToLocalStorage();
      const that = this;
      if(this.loop == null) {
        this.loop = new Tone.Loop((_) => {
          that.playNote(_);
          that.counter = (that.counter + 1) % that.actualNotes.length; 
        }, this.interval);
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
      localStorage["sequenceInput"]=this.sequenceInput;
      localStorage["forte"]=this.forte.toString();
      if(!!this.loop){
        this.loop.interval=this.interval;
      }
      Tone.getTransport().bpm.value = this.bpm;
      Tone.getTransport().timeSignature = [this.numerator,this.denominator];
    },
    
    async playNote(when : Tone.Unit.Seconds) {
      const arr = this.actualNotes[this.counter%this.actualNotes.length];
      if (arr.length > 0 && this.synth) {
        const vel = 0.5*Math.sqrt(1.0/arr.length);
        for(let note of arr) {
          this.synth.triggerAttackRelease(
            Tone.Frequency(note, 'midi').toFrequency(),
            2*(this.denominator*this.numerator)+"n",
            when,
            vel
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
      a.download = `SS3k-loop-${this.forte}-${this.bpm}bpm-${this.numerator}on${this.denominator}timesig-${this.formattedDate.toString()}.mid`;
      a.click();

      // Clean up the URL object
      URL.revokeObjectURL(url);
    }
  },
  async beforeMount() {
      await PCS12.init();
      const arr = Array.from(PCS12.getChords()).map(c => c.toString());
      arr.sort(PCS12.ReverseForteStringComparator);
      this.allChords=arr;
  },
  beforeUnmount() {
    this.stopSequencer(); // Ensure metronome stops when component unmounts
  },
  async onMounted() {
    this.saveSettingsToLocalStorage();
  }
});
</script>

<style scoped>
body, * {
  color: #00ff00;
  background-color: #000000;
}
h1 {
  text-align: center;
}
h1, h2, h3, h4 {
  margin-top: 2px;
  margin-bottom: 2px;
  padding:0;
}

button {
  padding: 10px;
  font-size: 18px; 
  border-radius: 5px;
  background-color: darkgrey;
  color: #00ff00; /* White text */
  cursor: pointer; /* Pointer cursor */
  transition: background-color 0.3s ease; /* Smooth transition */
  width: 100%; /* Full width for buttons */
}
.stopplay {
  font-size: 75px;
}
</style>