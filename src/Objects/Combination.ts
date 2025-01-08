import { Utils } from '../Utils';
import { BitSet } from './BitSet';

export class Combination extends BitSet {
    protected n: number;

    constructor(n: number) {
        super(n);
        this.n = n;
    }

    public getN(): number {
        return this.n;
    }

    public getK(): number {
        return this.cardinality();
    }
    public static fromBooleanArray(array: boolean[]): Combination {
        const combination = new Combination(array.length);
        for (let i = 0; i < array.length; i++) {
            combination.set(i, array[i]);
        }
        return combination;
    }
    public rotate(t: number): Combination {
        let k = t;
    
        // Normalize k to be within the range of n
        while (k < 0) {
            k += this.n;
        }
        while (k >= this.n) {
            k -= this.n;
        }
    
        const o = Combination.createWithSizeAndSet(this.n,new Set<number>(Array.from(this.getTrueBits()).map(x => (x + k) % this.n)));
        // Return a new Combination with the rotated BitSet
        return o;
    }
    public combinationString(): string {
        const str = Array.from(this.getTrueBits()).map((s) => s.toString()).join(" ");
        return str;
    }
    public async getComposition(): Promise<Composition> {
        const { Composition } = await import('./Composition'); 

        const nsb = this.nextSetBit(0);
        if (nsb === -1) {
            return new Composition(this.n); // Return empty composition if no set bits
        } else {
            const rotated = this.rotate(-nsb); // Rotate left by the index of the first set bit
            const compositionArray: boolean[] = [];
            for (let i = 1; i < this.n; i++) {
                compositionArray.push(rotated.get(i));
            }
            return Composition.compositionFromBooleanArray(compositionArray); // Return Composition
        }
    }

    public async calcSpan(): number {
        const compositionArray = (await this.getComposition()).asSequence(); // Get the underlying array representation
        const maxVal = Math.max(...compositionArray); // Find the maximum value in the array
        return this.getN() - maxVal;  // Calculate span
    }

    public getIntervalVector(): number[] {
        return Utils.calcIntervalVector(this.getBitSetAsNumberArray());
    }

    // Method to find the intersection of two combinations
    public intersect(c: Combination): Combination {
        const n = Math.min(this.getN(), c.getN());
        const intersectionBits: boolean[] = Array(n).fill(false);

        for (let i = 0; i < n; i++) {
            intersectionBits[i] = this.get(i) && c.get(i); // Bitwise AND operation
        }

        return Combination.fromBooleanArray(intersectionBits);
    }

    // Method to subtract one combination from another
    public minus(c: Combination): Combination {
        const resultBits: boolean[] = Array(this.getN()).fill(false); // Initialize with false
        const n = Math.min(this.getN(), c.getN());

        for (let i = 0; i < this.getN(); i++) {
            resultBits[i] = this.get(i); // Start with current combination bits
        }

        // for each index, set to false if both combinations have the bit set to true
        for (let i = 0; i < n; i++) {
            if (this.get(i) && c.get(i)) {
                resultBits[i] = false; // Remove the bit if it exists in both
            } else {
                resultBits[i] = this.get(i); // Keep the original bit if it doesn't exist in c
            }
        }

        return Combination.fromBooleanArray(resultBits);
    }

    // Static method to merge two combinations
    public static merge(a: Combination, b: Combination): Combination {
        const maxN = Math.max(a.getN(), b.getN());
        const mergedBits: boolean[] = Array(maxN).fill(false);

        for (let i = 0; i < a.getN(); i++) {
            mergedBits[i] = mergedBits[i] || a.get(i); // Bitwise OR operation
        }
        
        for (let i = 0; i < b.getN(); i++) {
            mergedBits[i] = mergedBits[i] || b.get(i); // Bitwise OR operation
        }

        return Combination.fromBooleanArray(mergedBits);
    }

    public mergeWith(a: Combination) {
        return Combination.merge(this,a);
    }

    public symmetricDifference(y: Combination): Combination {
        const x = new BitSet(Math.max(this.getN(), y.getN()));
        x.or(this);
        x.xor(y);
        return Combination.fromBooleanArray(x.getBitSetAsBooleanArray());
    }

    public toBinaryString(): string {
        let sb = '';
        for (let i = 0; i < this.n; i++) {
            sb += this.get(i) ? "1" : "0";
        }
        return sb;
    }

    public static fromBinaryString(s: string): Combination {
        s = s.trim();
        const n = s.length;
        const o = new Combination(n);
        for (let i = 0; i < n; i++) {
            o.set(i, s.charAt(i) !== '0');
        }
        return o;
    }
    public static createWithSizeAndSet(n: number, set: Set<number>): Combination {
        // Create a boolean array of size n
        const booleanArray: boolean[] = Array.from({ length: n }, (_, index) => set.has(index));
    
        // Use the fromBooleanArray method to create the Combination instance
        const combination = Combination.fromBooleanArray(booleanArray);
    
        // Return the new ImmutableCombination instance
        return combination;
    }
    public toString(): string {
        let output = '';
        for (let i = this.nextSetBit(0); i >= 0; i = this.nextSetBit(i + 1)) {
            output += `${i}, `;
        }
        if (output.length > 0) {
            output = output.substring(0, output.length - 2);
        }
        return `{${output}}`;
    }

    public asSequence(): number[] {
        const seq: number[] = [];
        for (let i = this.nextSetBit(0); i >= 0; i = this.nextSetBit(i + 1)) {
            seq.push(i);
        }
        return seq;
    }

    public asSet(): Set<number> {
        const o = new Set<number>();
        for (let i = this.nextSetBit(0); i >= 0; i = this.nextSetBit(i + 1)) {
            o.add(i);
        }
        return o;
    }

    // Example of additional methods you might want for your Combination class
    public isEmpty(): boolean {
        return this.cardinality() === 0;
    }

    public cardinality(): number {
        let count = 0;
        for (let i = 0; i < this.n; i++) {
            if (this.get(i)) count++;
        }
        return count;
    }

    public nextSetBit(fromIndex: number): number {
        for (let i = fromIndex; i < this.n; i++) {
            if (this.get(i)) {
                return i;
            }
        }
        return -1;  // Indicates no set bit found
    }
}


