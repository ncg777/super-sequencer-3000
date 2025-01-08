import Papa from 'papaparse';
import { CustomComparisonChain, Ordering } from '../Utils';
import {COMMON_NAMES,FORTE_NUMBERS} from '../ForteCSV';
import { ImmutableCombination } from './ImmutableCombination';
import { Combination } from './Combination';
import { Necklace } from './Necklace';

export class PCS12 extends ImmutableCombination {
    private static ChordCombinationDict = new Map<string, PCS12>();
    private static ForteNumbersDict = new Map<string, string>();
    private static ForteNumbersRotationDict = new Map<string, number>();
    private static ForteNumbersToPCS12Dict = new Map<string, PCS12>();
    private static ForteNumbersCommonNames = new Map<string, string>();

    constructor(set: Set<number>) {
        super(Combination.createWithSizeAndSet(12, set));
    }
    public getIntervals() :number[] {
      return this.transpose(-this.getForteNumberRotation()).getComposition().getCompositionAsArray();
    }

    public static identify(input: ImmutableCombination): PCS12 {
      if(input.isEmpty()) return PCS12.empty();
      if (input.getN() !== 12) {
        throw new Error("PCS12::IdentifyChord the combination is not bounded by 12");
      }
      if (input.isEmpty()) {
        return this.empty();
      }
      return this.ChordCombinationDict.get(input.combinationString())!; // Using non-null assertion since checked earlier
    }
    public static empty(): PCS12 {
        return new PCS12(new Set<number>());
    }

    public static generate(): Set<PCS12> {
        const output = new Set<PCS12>();
        const necklaceSet = Necklace.generate(12, 2);
        
        for (const necklace of necklaceSet) {
            const period = necklace.getPeriod();

            for (let j = 0; j < period; j++) {
                const currentSet = new Set<number>();
                for (let k = 0; k < 12; k++) {
                    if (necklace[k] === 1) {
                        currentSet.add((12 - (k + 1) + j) % 12);
                    }
                }
                
                if (currentSet.size > 0) {
                    output.add(new PCS12(currentSet));
                }
            }
            
        }
        output.add(PCS12.empty());
        return output;
    }

    public getForteNumber(): string {
      if(this.isEmpty()) return "0-1";
      const o = PCS12.ForteNumbersDict.get(this.combinationString());
      return o!!;
    }

    public getMean(): number {
        let sum = 0.0;
        let count = this.getK(); // Number of set bits
        for (let i = 0; i < 12; i++) {
            if (this.get(i)) {
                sum += i;
            }
        }
        return count === 0 ? 0 : sum / count;
    }

    public transpose(t: number): PCS12 {
        return PCS12.identify(this.rotate(t));
    }

    public intersect(other: PCS12): PCS12 {
        return PCS12.identify(super.intersect(other));
    }

    public minus(other: PCS12): PCS12 {
        return PCS12.identify(super.minus(other));
    }

    public static getChords(): Set<PCS12> {
      const output = new Set<PCS12>();
  
      for (let e of this.ChordCombinationDict.values()) {
          output.add(e);
      }
      return output;
  }
    private static async fillForteNumbersDict() {
      const forteRows : string[][]= FORTE_NUMBERS
        .split("\n")
        .map(l => l.split(",").map(s => s.replace(/"/g,'')));
      
      const forteNumbersDict = new Map<string, string>();
      const forteNumbersRotationDict = new Map<string, number>();
      const forteNumbersToPCS12Dict = new Map<string, PCS12>();
      const forteNumbersCommonNames = new Map<string, string>();
      for(let row of forteRows) {
          console.log("Processing row: " + row.toString())
          const forteNumber = row[0];
          const ns = (!row[1] || row[1].trim().length === 0) ? [] : row[1].split(/\s+/).map(num => Number(num));
          const c = ImmutableCombination.createWithSizeAndSet(12, new Set<number>(ns));
          
          const pcs12 = PCS12.identify(c);
          if(pcs12.isEmpty()) {
            forteNumbersDict.set(PCS12.empty().combinationString(), "0-1");
            forteNumbersRotationDict.set(PCS12.empty().combinationString(), 0);
            const str = "0-1.00";
            
            forteNumbersToPCS12Dict.set(str, PCS12.empty());
          } else {
            for (let i = 12; i >=0; i--) {
              const transposed = pcs12.transpose(i);
              forteNumbersDict.set(transposed.combinationString(), forteNumber);
              forteNumbersRotationDict.set(transposed.combinationString(), i);
              const str = `${forteNumber}.${String(i).padStart(2, '0')}`;
              
              forteNumbersToPCS12Dict.set(str, transposed);
            }
          } 
      }
      PCS12.ForteNumbersDict = forteNumbersDict
      PCS12.ForteNumbersRotationDict = forteNumbersRotationDict;
      PCS12.ForteNumbersToPCS12Dict = forteNumbersToPCS12Dict;
      
      const forteNamesRows : string[][]= COMMON_NAMES
        .split("\n")
        .map(l => l.split(",").map(s => s.replace(/"/g,'')));

      for(let row of forteNamesRows) {
        const forteNumber = row[0];
        const commonName = row[1];
        forteNumbersCommonNames.set(forteNumber, commonName);
      }
      
      PCS12.ForteNumbersCommonNames = forteNumbersCommonNames
  }

  public static ForteStringComparator: (o1: string, o2: string) => number = (o1, o2) => {
    // Add null/undefined checks before proceeding
    if (!o1 || !o2) {
        console.error(`ForteStringComparator: Invalid input - o1: "${o1}", o2: "${o2}".`);
        return 0; // Or handle it according to your logic, for instance, you could always treat undefined as less than defined
    }

    const p1 = PCS12.parseForte(o1);
    const p2 = PCS12.parseForte(o2);

    // Handle undefined cases gracefully
    if (!p1 && !p2) return 0; // Both are undefined, treat as equal
    if (!p1) return -1; // p1 is undefined, consider p2 greater
    if (!p2) return 1; // p2 is undefined, consider p1 greater

    return CustomComparisonChain.start<PCS12>()
        .setValues(p1, p2)
        .compare((x, y) => Ordering.natural().getComparator()(x.getK(), y.getK()))
        .compare((x, y) => Ordering.natural().getComparator()(x.getForteNumberOrder(), y.getForteNumberOrder()))
        .compare((x, y) => {
            const a = x.getForteAB();
            const b = y.getForteAB();
            return Ordering.natural().nullsFirst().getComparator()(a, b);
        })
        .compare((x,y) => Ordering.natural().getComparator()(x.getForteNumberRotation(),y.getForteNumberRotation()))
        .result();
  };

  public static ReverseForteStringComparator: (o1: string, o2: string) => number = (o1, o2) => this.ForteStringComparator(o2,o1);

  public getForteAB(): string {
    const f = this.getForteNumber()!!;
    return f.includes("A") ? "A" : f.includes("B") ? "B" : "";
  }

  public rotatedCompareTo(other: PCS12, rotate: number): number {
    return this.combination.rotate(rotate).compareTo(other.combination.rotate(rotate));
  }

  public static parseForte(input: string): PCS12 | undefined {
    if (!input) {
        console.warn(`parseForte: Received invalid input "${input}".`);
        return undefined; // Return undefined if input is invalid
    }
    
    const o = PCS12.ForteNumbersToPCS12Dict.get(input);
    if (!o) {
        console.warn(`parseForte: No PCS12 found for input "${input}".`);
    }
    return o;
}

  public combineWith(x: PCS12): PCS12 {
    return PCS12.identify(this.mergeWith(x));
  }

  public getCommonName(): string {
    const forteNumber = this.getForteNumber();
    if (forteNumber === undefined) {
        return 'Unknown'; // or any other fallback string
    }
    return PCS12.ForteNumbersCommonNames.get(forteNumber)!!;
  }

  public getForteNumberOrder(): number {
    let str = this.getForteNumber()!!; // Assumes this method is defined
    str = str.replace("z", "").replace("A", "").replace("B", "").substring(str.indexOf("-") + 1);
    return Number(str);
  }

  public getForteNumberRotation(): number {
    if(this.isEmpty()) return 0;
    return PCS12.ForteNumbersRotationDict.get(this.combinationString()) as number;
  }

  public toString(): string {
    const str = `${this.getForteNumber()}.${String(this.getForteNumberRotation()).padStart(2, '0')}`;
    return str;
  }

  private symmetries: Array<number> | null = null;

  public getSymmetries(): Array<number> {
    if (this.symmetries !== null) return this.symmetries;

    const o: Array<number> = [];
    for (let i = 0; i < 24; i++) {
      const axis = Math.floor(i / 2);
      let found = true;

      if (i % 2 === 0) {
        for (let j = 0; j < 7; j++) {
          if (this.get((axis + j) % 12) !== this.get((12 + axis - j) % 12)) {
            found = false;
            break;
          }
        }
      } else {
        for (let j = 0; j < 6; j++) {
          if (this.get((axis + j + 1) % 12) !== this.get((12 + axis - j) % 12)) {
            found = false;
            break;
          }
        }
      }

      if (found) {
        o.push(i / 2.0);
      }
    }
    
    this.symmetries = o;
    return o;
  }

  public static getForteChordDict(): { [key: string]: PCS12 } {
      const chordDict: { [key: string]: PCS12 } = {};
      
      // Assuming you want to populate it from the existing ChordDict
      this.ForteNumbersToPCS12Dict.forEach((value, key) => {
          chordDict[key] = value;
      });

      return chordDict;
  }
  
  private static async generateMaps() {
      const chords = this.generate();
      const chordCombinationDict = new Map<string, PCS12>();

      for (const chord of chords) {
          chordCombinationDict.set(chord.combinationString(), chord);
      }
      PCS12.ChordCombinationDict = chordCombinationDict;
      await this.fillForteNumbersDict(); // Load forte numbers after generating chords
  }
  private static _isInitializing: boolean = false;
  public static async init(): Promise<void> {
    if (this._isInitialized) {
        console.log("PCS12 is already initialized.");
        return;
    }
    if (this._isInitializing) {
      console.log("PCS12 is initializing.");
      return;
    }
    this._isInitializing = true;
    console.log("Initializing PCS12...");
    
    await PCS12.generateMaps();
    console.log("PCS12 initialized successfully.");
    this._isInitialized = true;
    this._isInitializing = false;
  }
  private static _isInitialized :boolean = false;
  public static isInitialized() : boolean {
    return this._isInitialized;
  }
}
