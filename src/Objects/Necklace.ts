import { Utils } from "../Utils";

export class Necklace extends Array<number> {
  private static cnt: number = 0;
  private m_Order: number | null;

  constructor(k: number, p_Order: number, array: number[]) {
      super(...array);
      let ex = false;

      for (let i = 0; i < array.length; i++) {
          if (array[i] >= k || array[i] < 0) {
              ex = true;
              break;
          }
      }

      if (ex) {
          throw new Error("Necklace constructor received incoherent arguments.");
      }

      this.m_Order = p_Order;
  }

  public getOrder(): number | null {
      return this.m_Order;
  }
    // Comparison method between two necklaces
    private compareTo(other: Array<number>): number {
      const minLength = Math.min(this.length, other.length);
      for (let i = 0; i < minLength; i++) {
          if (this[i] < other[i]) return -1;
          if (this[i] > other[i]) return 1;
      }
      // If they are the same for the length of the shorter one, check lengths
      if (this.length < other.length) return -1;
      if (this.length > other.length) return 1;
      return 0; // They are equal
  }
  // Method to calculate the period of the necklace
  public getPeriod(): number {
    let p: number = this.length; // Initialize 'p' to the size of the necklace
    for (let i = 1; i < this.length; i++) {
        if (this.compareTo(Utils.rotate(Array.from(this), i)) === 0) {
            p = i; // Found a rotation that matches
            break;  // Exit the loop
        }
    }
    return p; // Return the period
}
  public static generate(n: number, k: number): Set<Necklace> {
      Necklace.cnt = 0;
      const output = new Set<Necklace>();
      const a: number[] = Array(n + 1).fill(0);
      Necklace.subGen(1, 1, n, k, a, output);
      Necklace.cnt = 0;
      return output;
  }

  private static subGen(t: number, p: number, n: number, k: number, a: number[], output: Set<Necklace>): void {
      if (t > n) {
          if (n % p === 0) {
              const tmp: number[] = Array(n);
              for (let i = 0; i < n; i++) {
                  tmp[i] = a[i + 1];
              }
              output.add(new Necklace(k, Necklace.cnt, tmp));
              Necklace.cnt++;
          }
      } else {
          a[t] = a[t - p];
          Necklace.subGen(t + 1, p, n, k, a, output);
          for (let j = a[t - p] + 1; j < k; j++) {
              a[t] = j;
              Necklace.subGen(t + 1, t, n, k, a, output);
          }
      }
  }
}