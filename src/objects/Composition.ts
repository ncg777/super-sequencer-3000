import type { BitSet } from "./BitSet";
import { Combination } from "./Combination";

export class Composition extends Combination {
    constructor(n: number) {
        super(n-1);
    }

    getSum() {return this.size()+1;}
    // Creating a Composition from a boolean array
    public static compositionFromBooleanArray(comp: boolean[]): Composition {
        const instance = new Composition(comp.length+1);
        for (let i = 0; i < instance.n; i++) {
            if (comp[i]) {
                instance.set(i, true);
            }
        }
        return instance;
    }
    public static compositionFromCombination(comb:Combination) {
        const nsb = comb.nextSetBit(0);
        if (nsb === -1) {
            return new Composition(comb.size());
        } else {
            const t = comb.rotate(-nsb); 
            const l: boolean[] = [];
            for (let i = 1; i < comb.size(); i++) {
                l.push(t.get(i));
            }
            return Composition.compositionFromBooleanArray(l);
        }

    }
    
    public static compositionFromBitSet(x: BitSet): Composition {
        const instance = new Composition(x.size()+1);
        for (let i = 0; i < x.size(); i++) {
            if (x.get(i)) {
                instance.set(i, true);
            }
        }
        return instance;
    }

    getCompositionAsArray(): number[] {
        const result: number[] = [];
        let count = 1;
        for (let i = 0; i < this.n; i++) {
            if (this.get(i)) {
                result.push(count);
                count = 1;
            } else {
                count++;
            }
        }
        result.push(count); // Push the last segment

        return result;
    }

    getCompositionAsCombination(): Combination {
        const o = new Combination(this.n + 1);
        o.set(0);
        for (let i = 1; i < this.n + 1; i++) {
            o.set(i, this.get(i - 1));
        }
        return o;
    }

    degrade(): Composition {
        const c = this.cardinality();
        if (c === 0) {
            throw new Error("Composition cannot be degraded because it has a cardinality of zero.");
        }
        const o = new Composition(this.getSum() - 1);
        if (c === 1) {
            return o;
        }
        let i = this.nextSetBit(0); // It can't be that i = -1
        for (let j = 0; j < o.n; j++) {
            o.set(j, this.get((j + i + 1) % o.n));
        }
        return o;
    }

    partitionByEquality(): number[] {
        const s = this.getCompositionAsArray();
        const groups: number[] = new Array(s.length).fill(0);
        let k = 0;
        for (let j = s.length - 1; j >= 0; j--) {
            if (s[0] === s[j]) { k--; }
            else { break; }
        }
        k += s.length;
        k = k % s.length;
        let previousValue = s[k];
        let currentGroup = 0;
        for (let i = k + 1; i < s.length + k; i++) {
            const v = s[i % s.length];
            if (v !== previousValue) {
                currentGroup++;
            }
            groups[i % groups.length] = currentGroup;
            previousValue = v;  
        }
        return groups;
    }


    toString(): string {
        return this.getCompositionAsArray().join(" ");
    }

}
