<template>  
	<v-app>
		<v-main>
		  <v-responsive class="align-center mx-auto pa-4" max-width="900">
			<h1>Super Sequencer 3k
      <v-btn 
          icon 
          @click="showHelp = true" 
          class="help-button"
        >
          <v-icon>mdi-help-circle</v-icon>
        </v-btn>
      </h1>
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
            :label="`Sequence (${sequence.length})`"
            v-model="sequenceInput" 
            placeholder="e.g. 0 1 2..." 
            @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
			<v-row class="compact-row">
			  <v-col cols="12">
          <v-slider :label="'Tempo (' + bpm + ' BPM)'" min=1 step=1 max=499 v-model.number="bpm" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col colr="12">
          <v-slider :label="'Numerator (' + numerator + ')'" min=1 step=1 max=16 v-model.number="numerator" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
			  <v-col cols="12">
				  <v-slider :label="'Denominator ('+ denominator + ')'" min=1 step=1 max=16 v-model.number="denominator" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
			</v-row>
      <v-row class="compact-row">
        <v-col cols="12">
				  <v-slider :label="'Octave shift ('+ octave + ')'" min=0 step=1 max=10 v-model.number="octave" @update:modelValue="saveSettingsToLocalStorage" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col cols="12">
          <v-slider 
            :label="'Note Length (' + lengthFactor + '%)'" 
            min="1" 
            max="400" 
            step="1" 
            v-model.number="lengthFactor" 
            @update:modelValue="saveSettingsToLocalStorage" 
          />
        </v-col>
      </v-row>
      
      <v-row>
        <v-col cols="4">
          <v-switch 
            v-model="useMidiOutput" 
            label="MIDI" 
            @update:modelValue="updateMidiMode"
          />
        </v-col>
        <v-col cols="4" v-if="useMidiOutput">
          <v-select 
            v-model="selectedMidiDevice" 
            :items="midiDevices" 
            label="MIDI Device" 
            @update:modelValue="updateMidiDevice"
          />
        </v-col>
        <v-col cols="4" v-if="useMidiOutput">
          <v-slider 
            :label="'Channel (' + midiChannel + ')'" 
            min="1" 
            max="16" 
            step="1" 
            v-model.number="midiChannel"
          />
        </v-col>
      </v-row>
      
			<button @click="toggleSequencer" class="stopplay">{{ isRunning ? '⏹️' : '▶️' }}</button>
      <button @click="copyURL" class="userbutton">📋Copy URL</button>
			<button @click="downloadMIDI" class="downloadmidi">Download MIDI</button>

      <!-- Help Modal -->
      
		  </v-responsive>
      <!-- Help Modal -->
      <v-dialog v-model="showHelp" max-width="800px">
          <v-card class="pa-4 bg-black">
            <v-card-title class="pa-4">
              <span class="text-h5 font-weight-bold">Super Sequencer 3000 <small style="font-size:0.6em; color:#888; margin-left:1em;">v{{ appVersion }}</small></span>
              <v-spacer></v-spacer>
              <v-btn icon @click="showHelp = false" class="close-btn">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-4">
              <h4 class="mb-2">How the Sequencer Works</h4>
              <p>The sequencer allows you to customize the following parameters:</p>
              <ul>
                <li><strong>Forte number</strong>: The pitch-class set to use as Forte number with transposition (see
                  <a target="_blank" href="https://en.wikipedia.org/wiki/List_of_set_classes">Forte numbers</a>).</li>
                <li><strong>BPM</strong>: Controls the tempo of the sequence.</li>
                <li><strong>Numerator</strong>: The top number of the time signature.</li>
                <li><strong>Denominator</strong>: The bottom number of the time signature.</li>
                <li><strong>Waveform</strong>: Select from sine, square, triangle, or sawtooth waveforms.</li>
                <li><strong>Sequence</strong>: Input a sequence of numbers to generate notes based on their binary
                  representation.</li>
                <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played.</li>
                <li><strong>Note length</strong>: Multiplies the durations of the notes played.</li>
              </ul>

              <h3 class="mt-4 mb-2">How Notes Are Computed in the Encoding Scheme</h3>
              <p>This application uses a binary-based encoding system to determine which notes are played from numerical
                values. Here's how it works:</p>

              <ol>
                <li><strong>Binary Representation of Numbers:</strong>
                  <ul>
                    <li>Each number's absolute value is converted into binary, with bit 0 at position 0, bit 1 at
                      position 1, and so on. For example:</li>
                    <ul>
                      <li>The number <code>5</code> becomes <code>101</code>.</li>
                      <li>The number <code>10</code> becomes <code>0101</code>.</li>
                    </ul>
                    <li>Negative numbers are supported and in this case the note indices are computed as you would
                      expect.</li>
                  </ul>
                </li>
                <li><strong>Pitch Class Assignment:</strong>
                  <ul>
                    <li>Each binary digit corresponds to a position in the selected pitch class set, with the octave shift, going up and down octavewise
                      to the minimal and maximal midi pitch. For example, to give a general idea without considering the octave, for 3-11B.00 you would get:
                      <ul>
                        <li>Position 0 = C</li>
                        <li>Position 1 = E</li>
                        <li>Position 2 = G</li>
                        <li>Position 3 = C</li>
                        <li>...</li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li><strong>Chords:</strong>
                  <ul>
                    <li>If multiple <code>1</code>s are present, the corresponding notes form a chord.</li>
                    <li>Example: The number <code>7</code> (<code>111</code>) maps to C, E, and G.</li>
                  </ul>
                </li>
              </ol>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions class="pa-4">
              <v-spacer></v-spacer>
              <v-btn color="primary" @click="showHelp = false">Close</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-main>
  </v-app>
</template>

<script lang="ts">
import pkg from '../package.json';
const appVersion = pkg.version;
import { defineComponent, markRaw } from 'vue';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { PCS12 } from 'ultra-mega-enumerator';

export default defineComponent({
  name: 'App',
  data() {
    const params = new URLSearchParams(window.location.search);

    return {
      bpm: parseInt(params.get("bpm") ?? localStorage.getItem("ss3k_bpm")?? "90") ,
      numerator: parseInt(params.get("numerator") ?? localStorage.getItem("ss3k_numerator")?? "4"),
      denominator: parseInt(params.get("denominator") ?? localStorage.getItem("ss3k_denominator") ?? "5"),
      waveform: params.get("waveform") ?? localStorage.getItem("ss3k_waveform") ?? "sine",
      sequenceInput: params.get("sequence") ?? localStorage.getItem("ss3k_sequence") ?? '1 2 4 8 16',
      octave: parseInt(params.get("octave") ?? localStorage.getItem("ss3k_octave") ?? "6"),
      lengthFactor: parseInt(params.get("lengthFactor") ?? localStorage.getItem("ss3k_lengthFactor") ?? "100"),
      allChords: [] as string[],
      isRunning: false,
      loop: null as Tone.Loop|null,
      forte: params.get("forte") ?? localStorage.getItem("ss3k_forte") ?? "5-35.05",
      counter: 0,
      showHelp: false,
      synth: markRaw(new Tone.PolySynth(Tone.Synth).toDestination()),
      useMidiOutput: false,
      midiDevices: [] as string[],
      selectedMidiDevice: null,
      midiChannel: 1,
      midiAccess: null as MIDIAccess | null,
      midiOutput: null as MIDIOutput | null,
      appVersion: appVersion,
      pnowMs: -1,
      transportnowMs:-1,
    };
  },
  computed: {
    synth():Tone.PolySynth {
      const o = markRaw(new Tone.PolySynth(Tone.Synth,{
          envelope:{
            attackCurve: 'exponential',
            attack: (this.quant/2.0).toString()+"s",
            decay:0,
            releaseCurve: 'exponential',
            release: (this.quant/2.0).toString()+"s",
            sustain: 1.0
          },
          oscillator: {
                type: 
                  this.waveform === "triangle" ? 'triangle' : 
                    this.waveform === "sawtooth" ? 'sawtooth' : 
                      this.waveform === "square" ? 'square' : 'sine1'
          }
        }).toDestination());
        o.context.lookAhead = 1;
        return o;
    },
    quant() {return 240.0/(this.bpm*this.numerator*this.denominator);},
    sequence(): number[] {
      return this.sequenceInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },
    scale(): number[] {
      const s = PCS12.parseForte(this.forte);
      const p = s?.asSequence()||[];
      const o = [];
      
      for(const n of p) {
        for(let i=0;i<=10;i++) {
          const t = n+(12*i);
          if(t < 128) o.push(t);
        }
      }
      o.sort((a,b) => a-b);
      return o; 
    },
    actualNotes():number[][] {
      const s = PCS12.parseForte(this.forte);
      if(!s) return [];
      const k = s?.getK()??0;
      return this.sequence.map(
        (n:number) => {
          const bits = Math.abs(n).toString(2).split('').reverse();
          const sign = Math.sign(n);
          return this.scale
            .filter(
              (_, idx) => {
                const bitIndex = (sign*(idx-this.octave*k));
                
                return bitIndex >=0 && bitIndex < bits.length && bits[bitIndex] == "1";
              }
            );

        });
    },
    formattedDate() {
      return (timestamp => `${new Date(timestamp).getUTCFullYear()}${String(new Date(timestamp).getUTCMonth() + 1).padStart(2, '0')}${String(new Date(timestamp).getUTCDate()).padStart(2, '0')}T${String(new Date(timestamp).getUTCHours()).padStart(2, '0')}${String(new Date(timestamp).getUTCMinutes()).padStart(2, '0')}${String(new Date(timestamp).getUTCSeconds()).padStart(2, '0')}Z`)(Date.now());
    },
  },
  methods: {
    async initializeMidi() {
      try {
        const access = await navigator.requestMIDIAccess();
        this.midiAccess = access;
        
        this.midiDevices = Array.from(access.outputs.values()).map(output => output.name!);
      } catch (error) {
        console.error("Failed to initialize MIDI:", error);
      }
    },
    updateMidiDevice() {
      const device = Array.from(this.midiAccess?.outputs.values() || []).find(output => output.name === this.selectedMidiDevice);
      this.midiOutput = device || null;
    },
    updateMidiMode() {
      if (this.useMidiOutput) {
        this.initializeMidi();
      } else {
        //this.midiOutput = null;
      }
    },
    async playNoteWithMidi(note: number, velocity: number, duration: Tone.Unit.Seconds, when: number) {
      if (this.midiOutput!!) {
          const noteOn = [0x90 + this.midiChannel-1, note, Math.round(velocity * 127)];
          const noteOff = [0x80 + this.midiChannel-1, note, 0];
          this.midiOutput!.send(noteOn, this.pnowMs-this.transportnowMs+(when*1000));
          this.midiOutput!.send(noteOff, this.pnowMs-this.transportnowMs+((when+duration)*1000));
      }
    },
    updateSynth() {
      const waveformType = 
        this.waveform === "triangle" ? 'triangle' :
        this.waveform === "sawtooth" ? 'sawtooth' :
        this.waveform === "square" ? 'square' : 'sine';

      this.synth.set({
        envelope: {
          attackCurve: 'exponential',
          attack: (this.quant / 2.0).toString() + "s",
          decay: 0,
          releaseCurve: 'exponential',
          release: (this.quant / 2.0).toString() + "s",
          sustain: 1.0
        },
        oscillator: {
          type: waveformType
        }
      });
      
      // Set lookahead
      this.synth.context.lookAhead = 1;
    },
    async getMidi():Promise<Midi> {
      const midi = new Midi();
      const track = midi.addTrack();
      track.channel = this.useMidiOutput ? this.midiChannel-1 : 0;
      
      midi.header.setTempo(this.bpm);
      for(let i=0;i < this.actualNotes.length;i++) {
        const notes = this.actualNotes[i];
        const vel = 0.5*Math.sqrt(1.0/notes.length);

        let dur = 1;
        while(this.actualNotes[(i+dur)%this.actualNotes.length].length == 0) dur++;
        
        for(let note of notes) {
          track.addNote({
            midi: note,
            time: i*this.quant,
            duration: dur*this.quant*this.lengthFactor/100.0,
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
    async copyURL() {
      await navigator.clipboard.writeText(encodeURI(`https://ncg777.github.io/super-sequencer-3000?bpm=${this.bpm}&numerator=${this.numerator}&denominator=${this.denominator}&waveform=${this.waveform}&octave=${this.octave}&forte=${this.forte}&lengthFactor=${this.lengthFactor}&sequence=${this.sequenceInput}`));
      window.alert("URL copied to clipboard.");
    },
    async startSequencer() {
      if(this.isRunning) return;
      this.isRunning = true;
      this.counter = 0;
      await Tone.start();
      this.updateSynth();
      console.log('Audio context started');
      this.saveSettingsToLocalStorage();
      const that = this;
      if(this.loop == null) {
        this.loop = new Tone.Loop(async (_) => {
          that.playNote(_, that.counter);
          that.counter = (that.counter + 1) % that.actualNotes.length; 
        }, this.quant.toString()+"s");
      }
      
      this.loop.start(0);
      Tone.getTransport().seconds=0;
      if(this.pnowMs < 0) this.pnowMs = performance.now();
      this.transportnowMs = Tone.getTransport().seconds*1000;
      Tone.getTransport().start();
    },
    stopSequencer() {
      if(!this.isRunning) return;
      this.isRunning = false;
      this.loop?.stop();
      Tone.getTransport().stop();
      Tone.getTransport().seconds=0;
      console.log('Stopped');
    },
    
    saveSettingsToLocalStorage() {
      localStorage.setItem("ss3k_bpm", this.bpm.toString());
      localStorage.setItem("ss3k_numerator", this.numerator.toString());
      localStorage.setItem("ss3k_denominator", this.denominator.toString());
      localStorage.setItem("ss3k_octave", this.octave.toString());
      localStorage.setItem("ss3k_waveform", this.waveform);
      localStorage.setItem("ss3k_sequence", this.sequenceInput);
      localStorage.setItem("ss3k_forte", this.forte);
      localStorage.setItem("ss3k_lengthFactor", this.lengthFactor.toString());
      if(!!this.loop){
        this.loop.interval=this.quant.toString()+"s";
      }
      Tone.getTransport().bpm.value = this.bpm;
      Tone.getTransport().timeSignature = [this.numerator,this.denominator];
      this.updateSynth();
    },
    
    async playNote(when : Tone.Unit.Seconds, counter:number) {
      const arr = this.actualNotes[counter%this.actualNotes.length];
      
      if (arr.length > 0 && this.synth) {
        let dur = 1;
        while(this.actualNotes[(counter+dur)%this.actualNotes.length].length == 0) dur++;
        
        const vel = 0.5*Math.sqrt(1.0/arr.length);
        
        if (this.useMidiOutput) {
          for (const note of arr) {
            this.playNoteWithMidi(note, vel, dur * this.quant * this.lengthFactor / 100.0, when);
          }
        } else if (this.synth) {
          this.synth.triggerAttackRelease(
            arr.map(note => Tone.Frequency(note, 'midi').toFrequency()),
            (dur * this.quant * this.lengthFactor / 100.0).toString() + "s",
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
      a.download = `SSeq3k-${this.formattedDate.toString()}-${this.forte}-${this.bpm}bpm-${this.numerator}on${this.denominator}timesig.mid`;
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
      this.updateSynth();
  },
  beforeUnmount() {
    this.stopSequencer();
    this.synth.dispose();
  },
  async onMounted() {
    this.saveSettingsToLocalStorage();
    if (this.useMidiOutput) {
      await this.initializeMidi();
  }
  }
});
</script>

<style scoped>
body, * {
  background-color: #000000;
}
h1 {
  text-align: center;
  margin-bottom: 16pt;
}

.downloadmidi {
  padding: 10px;
  font-size: 18px;
  width: 100%;
}
.userbutton {
  padding: 10px;
  font-size: 18px;
  width: 100%;
}
.stopplay {
  padding: 2px;
  font-size: 50px;
  width: 100%;
  margin-bottom: 5px;
}
.close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
}
.compact-row * {
  padding:0;
  margin-bottom: 0;
  margin-top: 0;
}
</style>