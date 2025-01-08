export class BitSet {
    protected bits: Set<number>;
    protected n: number;

    constructor(n: number) {
        if (n < 0) {
            throw new Error("Invalid BitSet size.");
        }
        this.n = n;
        this.bits = new Set<number>();
    }
    
    public getTrueBits():Set<number>{
        return new Set(this.bits);
    }

    compareTo(other: BitSet): number {
        if (this.n < other.n) return -1;
        if (this.n > other.n) return 1;

        for (let i = 0; i < this.n; i++) {
            const thisBit = this.get(i);
            const otherBit = other.get(i);
            if (thisBit < otherBit) return -1;
            if (thisBit > otherBit) return 1;
        }

        return 0;
    }

    size(): number {
        return this.n;
    }

    get(bitIndex: number): boolean {
        if (bitIndex >= this.n) {
            throw new Error("Index out of bounds");
        }
        return this.bits.has(bitIndex);
    }

    set(bitIndex: number, value: boolean = true): void {
        if (bitIndex >= this.n) {
            throw new Error("Index out of bounds");
        }
        if (value) {
            this.bits.add(bitIndex);
        } else {
            this.bits.delete(bitIndex);
        }
    }

    clear(bitIndex: number): void {
        this.bits.delete(bitIndex);
    }

    flip(bitIndex: number): void {
        if (this.bits.has(bitIndex)) {
            this.bits.delete(bitIndex);
        } else {
            this.bits.add(bitIndex);
        }
    }

    nextSetBit(fromIndex: number): number {
        for (let i = fromIndex; i < this.n; i++) {
            if (this.get(i)) {
                return i;
            }
        }
        return -1;
    }

    nextClearBit(fromIndex: number): number {
        for (let i = fromIndex; i < this.n; i++) {
            if (!this.get(i)) {
                return i;
            }
        }
        return -1;
    }

    previousSetBit(fromIndex: number): number {
        for (let i = fromIndex; i >= 0; i--) {
            if (this.get(i)) {
                return i;
            }
        }
        return -1;
    }

    previousClearBit(fromIndex: number): number {
        for (let i = fromIndex; i >= 0; i--) {
            if (!this.get(i)) {
                return i;
            }
        }
        return -1;
    }

    toBitString(): string {
        return Array.from({ length: this.n }, (_, i) => this.get(this.n - (i + 1)) ? "1" : "0").join("");
    }

    toString(): string {
        return this.toBitString();
    }

    cardinality(): number {
        return this.bits.size;
    }

    and(bitSet: BitSet): void {
        this.bits = new Set<number>(
            [...this.bits].filter(bit => bitSet.get(bit))
        );
    }

    or(bitSet: BitSet): void {
        this.bits = new Set<number>(
            [...this.bits, ...Array.from(bitSet.bits)]
        );
    }

    xor(bitSet: BitSet): void {
        const union = new Set<number>([...this.bits, ...Array.from(bitSet.bits)]);
        const intersection = new Set<number>(
            [...this.bits].filter(bit => bitSet.get(bit))
        );

        this.bits = new Set<number>(
            [...union].filter(bit => !intersection.has(bit))
        );
    }

    equals(obj: any): boolean {
        return obj instanceof BitSet && this.n === obj.n && [...this.bits].every(bit => obj.get(bit));
    }

    copy(): BitSet {
        const clone = new BitSet(this.n);
        this.bits.forEach(bit => clone.set(bit));
        return clone;
    }

    getBitSetAsNumberArray(): number[] {
        return Array.from({ length: this.n }, (_, i) => this.get(i) ? 1 : 0);
    }
    
    getBitSetAsBooleanArray(): boolean[] {
        return Array.from({ length: this.n }, (_, i) => this.get(i) ? true : false);
    }

    rotate(t: number): BitSet {
        let k = t;
        while (k < 0) k += this.n;
        while (k >= this.n) k -= this.n;
        const rotated = new BitSet(this.n);
        this.bits.forEach(bit => rotated.set((bit + k +         this.n) % this.n));
        return rotated;
    }

    union(other: BitSet): BitSet {
        const result = new BitSet(this.n);
        other.bits.forEach(bit => result.set(bit));
        this.bits.forEach(bit => result.set(bit));
        return result;
    }

    intersection(other: BitSet): BitSet {
        const result = new BitSet(this.n);
        this.bits.forEach(bit => {
            if (other.get(bit)) {
                result.set(bit);
            }
        });
        return result;
    }

    minus(other: BitSet): BitSet {
        const result = new BitSet(this.n);
        this.bits.forEach(bit => {
            if (!other.get(bit)) {
                result.set(bit);
            }
        });
        return result;
    }

    static bitSetFromNumberArray(bitArray: number[]): BitSet {
        const bs = new BitSet(bitArray.length);
        bitArray.forEach((bit, i) => bs.set(i, bit === 1));
        return bs;
    }

    static fromBitString(bitString: string): BitSet {
        const na = [];
        for (let i = 0; i < bitString.length; i++) {
            na.push(bitString.charAt(i) === "1" ? 1 : 0);
        }
        return BitSet.bitSetFromNumberArray(na);
    }

    intersects(bitSet: BitSet): boolean {
        return Array.from(this.bits).some(bit => bitSet.get(bit));
    }

    isEmpty(): boolean {
        return this.bits.size === 0;
    }

    resize(newSize: number): void {
        if (newSize < 1) {
            throw new Error("Invalid BitSet size");
        }
        const newBits = new Set<number>();
        this.bits.forEach(bit => {
            if (bit < newSize) {
                newBits.add(bit);
            }
        });
        this.n = newSize;
        this.bits = newBits;
    }
}