import { Parser } from "./parser.ts";

export class Assembler {
  public compile(source: string): Uint8Array {
    const parser = new Parser(source);
    const instructions = parser.parse();

    const binary = new Uint8Array(instructions.length * 4);

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      const encoded = this.encode(inst);

      binary[i * 4 + 0] = (encoded >>> 24) & 0xFF;
      binary[i * 4 + 1] = (encoded >>> 16) & 0xFF;
      binary[i * 4 + 2] = (encoded >>> 8) & 0xFF;
      binary[i * 4 + 3] = encoded & 0xFF;
    }

    return binary;
  }

  private encode(inst: {
    opcode: number;
    rd: number;
    rs: number;
    rt: number;
    imm: number;
  }): number {
    return (
      (inst.opcode << 24) |
      (inst.rd << 20) |
      (inst.rs << 16) |
      (inst.rt << 12) |
      (inst.imm & 0xFFF)
    ) >>> 0;
  }
}

