import { BitSet } from './objects/BitSet'; // Import BitSet if it's defined in another file
import { PCS12 } from './objects/PCS12';

class Utils {
    public static calcIntervalVector(input: number[]): number[] {
        const n = input.length;
        const m = Math.floor(n / 2);
        const result: number[] = [];
        for (let i = 1; i <= m; i++) {
            let k = 0;
            for (let j = 0; j < n; j++) {
                if (input[j] && input[(i + j) % n]) {
                    k++;
                }
            }
            // Adjust the count for even-sized arrays
            if (i === m && n % 2 === 0) {
                k = Math.floor(k / 2);
            }
            result.push(k);
        }
        return result;
    }

    public static calcIntervalVectorFromBitSet(input: BitSet): number[] {
        const n = input.size();
        const m = Math.floor(n / 2);
        const result: number[] = [];
        for (let i = 1; i <= m; i++) {
            let k = 0;
            for (let j = 0; j < n; j++) {
                if (input.get(j) && input.get((i + j) % n)) {
                    k++;
                }
            }
            // Adjust the count for even-sized arrays
            if (i === m && n % 2 === 0) {
                k = Math.floor(k / 2);
            }
            result.push(k);
        }
        return result;
    }
    /**
     * Rotates a sequence n positions to the right. If n is negative, rotates -n positions to the left.
     * 
     * @param arr The array to be rotated.
     * @param n The number of positions to rotate. Positive for right, negative for left.
     * @return A new rotated array.
     */
    public static rotate(arr: number[], n: number): number[] {
        const len = arr.length;
        if (len === 0) return []; // Return an empty array if input is empty
        n = ((n % len) + len) % len; // Normalize n to be within the array length
        return [...arr.slice(len - n), ...arr.slice(0, len - n)]; // Rotate the array
    }

    /**
     * Rotates sequence 1 position to the right.
     * 
     * @param arr The array to be rotated.
     * @return A new array rotated to the right.
     */
    public static rotateRight(arr: number[]): number[] {
        return this.rotate(arr, 1);
    }

    /**
     * Rotates sequence 1 position to the left.
     * 
     * @param arr The array to be rotated.
     * @return A new array rotated to the left.
     */
    public static rotateLeft(arr: number[]): number[] {
        return this.rotate(arr, -1);
    }
}
  
class Ordering {
    private comparator: (a: any, b: any) => number;

    constructor(comparator: (a: any, b: any) => number) {
        this.comparator = comparator;
    }

    static natural(): Ordering {
        return new Ordering((a: any, b: any): number => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
    }

    nullsFirst(): Ordering {
        const originalComparator = this.comparator;

        return new Ordering((a: any, b: any): number => {
            if (a === null && b === null) return 0;
            if (a === null) return -1; // nulls come first
            if (b === null) return 1; 
            return originalComparator(a, b);
        });
    }

    // This method returns the comparison function
    getComparator(): (a: any, b: any) => number {
        return this.comparator;
    }
}

  
class CustomComparisonChain<T> {
    private comparisons: Array<() => number> = [];
    private a!: T; // Storing the first value, using non-null assertion
    private b!: T; // Storing the second value, using non-null assertion

    static start<T>(): CustomComparisonChain<T> {
        return new CustomComparisonChain<T>();
    }

    // Setting the values for comparison
    public setValues(a: T, b: T): this {
        this.a = a;
        this.b = b;
        return this; // for method chaining
    }

    compare(comparator: (x: T, y: T) => number): this {
        // Store a comparison function that takes the stored a and b
        this.comparisons.push(() => comparator(this.a, this.b));
        return this; // for method chaining
    }

    result(): number {
        for (const compareFn of this.comparisons) {
            const comparisonResult = compareFn();
            if (comparisonResult !== 0) {
                return comparisonResult;
            }
        }
        return 0;
    }
}
class SubsetOf {
    private pCS12: PCS12;

    constructor(pCS12: PCS12) {
        this.pCS12 = pCS12;
    }

    public apply(input: PCS12): boolean {
        // Check if pCS12 is a subset of input by comparing the size after intersection
        return input.intersect(this.pCS12).getK() === input.getK();
    }
}

class SupersetOf {
    private pCS12: PCS12;

    constructor(pCS12: PCS12) {
        this.pCS12 = pCS12;
    }

    public apply(input: PCS12): boolean {
        // Check if pCS12 is a subset of input by comparing the size after intersection
        return this.pCS12.intersect(input).getK() === this.pCS12.getK();
    }
}

// Export the Utils class statically
export { Utils,CustomComparisonChain, Ordering, SubsetOf, SupersetOf };
