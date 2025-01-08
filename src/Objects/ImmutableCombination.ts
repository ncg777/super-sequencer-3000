import { Combination } from "./Combination";
import type { Composition } from "./Composition";

/**
 * The {@code ImmutableCombination} class represents a combination of elements that cannot 
 * be modified after creation. It encapsulates an instance of the {@code Combination} class, 
 * providing an immutable interface for handling set operations relevant to combinatorial 
 * structures in various contexts, including music theory.
 */
export class ImmutableCombination {
    
    protected readonly combination: Combination;

    protected constructor(combination: Combination) {
        this.combination = combination;
    }

    public static fromCombination(c: Combination): ImmutableCombination {
        return new ImmutableCombination(c);
    }

    public static fromBinarySequence(seq: boolean[]): ImmutableCombination {
        return new ImmutableCombination(Combination.fromBooleanArray(seq));
    }

    public static createWithSize(n: number): ImmutableCombination {
        return new ImmutableCombination(new Combination(n));
    }

    public static createWithSizeAndSet(n: number, set: Set<number>): ImmutableCombination {
        return new ImmutableCombination(Combination.createWithSizeAndSet(n, set));
    }

    public getN(): number {
        return this.combination.size();
    }

    public getK(): number {
        return this.combination.cardinality();
    }
    public combinationString(): string {
        return this.combination.combinationString();
    }
    public calcSpan(): number {
        return this.combination.calcSpan();
    }

    public getIntervalVector(): number[] {
        return this.combination.getIntervalVector();
    }
    public rotate(t: number): ImmutableCombination {
        return new ImmutableCombination(this.combination.rotate(t));
    }

    public intersect(c: ImmutableCombination): ImmutableCombination {
        return new ImmutableCombination(this.combination.intersect(c.combination));
    }
    public minus(c: ImmutableCombination): ImmutableCombination {
        return new ImmutableCombination(this.combination.minus(c.combination));
    }
    public static merge(a: ImmutableCombination, b: ImmutableCombination): ImmutableCombination {
        return new ImmutableCombination(Combination.merge(a.combination,b.combination));
    }
    public mergeWith(c: ImmutableCombination): ImmutableCombination {
        return new ImmutableCombination(this.combination.mergeWith(c.combination));
    }
    public symmetricDifference(y: ImmutableCombination): ImmutableCombination {
        return new ImmutableCombination(this.combination.symmetricDifference(y.combination));
    }

    public getComposition(): Composition {
        return this.combination.getComposition();
    }

    public get(bitIndex: number): boolean {
        return this.combination.get(bitIndex);
    }

    public isEmpty(): boolean {
        return this.combination.isEmpty();
    }

    public toString(): string {
        return this.combination.toString();
    }
    public asSequence(): number[] {
        return this.combination.asSequence();
    }
    public equals(obj: any): boolean {
        if (!(obj instanceof ImmutableCombination)) return false;
        return this.combination.equals(obj.combination);
    }

}
