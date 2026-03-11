import { panic } from "../common/panic.ts";

export class CPU {
  private programCounter = 0;
  private stackPointer = 0xFFFF;
  private registers = new Uint32Array(16);
  private memory = new Uint8Array(64 * 1024);

  private read32(addr: number) {
    const m = this.memory;
    const [b0, b1, b2, b3] = [m[addr], m[addr + 1], m[addr + 2], m[addr + 3]];
    return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  }

  private write32(addr: number, value: number) {
    const m = this.memory;
    [m[addr], m[addr + 1], m[addr + 2], m[addr + 3]] = [
      value >>> 24,
      (value >>> 16) & 0xFF,
      (value >>> 8) & 0xFF,
      value & 0xFF,
    ];
  }

  public reset() {
    this.programCounter = 0;
    this.stackPointer = 0xFFFF;
    this.registers.fill(0);
  }

  public start() {
    while (true) {
      const inst = this.read32(this.programCounter);
      const opcode = inst >>> 24;
      const rd = (inst >>> 20) & 0xF;
      const rs = (inst >>> 16) & 0xF;
      const rt = (inst >>> 12) & 0xF;
      const imm = inst & 0xFFF;

      switch (this.execute(opcode, rd, rs, rt, imm)) {
        case 0:
          this.programCounter += 4;
          break;
        case 1:
          throw panic(`Unknown opcode: ${opcode}`);
        case 2:
          return;
        default:
          throw panic();
      }
    }
  }

  private execute(
    opcode: number,
    rd: number,
    rs: number,
    rt: number,
    imm: number,
  ) {
    switch (opcode) {
      case 0x00: { // ADD
        const a = this.registers[rs];
        const b = this.registers[rt];
        this.registers[rd] = (a + b) >>> 0;
        break;
      }
      case 0x01: { // SUB
        const a = this.registers[rs];
        const b = this.registers[rt];
        this.registers[rd] = (a - b) >>> 0;
        break;
      }

      case 0x13: // LUI (Load Upper Immediate)
        this.registers[rd] = imm;
        break;

      case 0x23: { // LW (Load Word)
        const loadAddr = this.registers[rs] + imm;
        this.registers[rd] = this.read32(loadAddr);
        break;
      }
      case 0x2B: { // SW (Store Word)
        const storeAddr = this.registers[rs] + imm;
        this.write32(storeAddr, this.registers[rd]);
        break;
      }

      case 0x04: { // BEQ
        const offset = (imm << 20) >> 20;
        if (this.registers[rs] === this.registers[rt]) {
          this.programCounter += offset;
        }
        break;
      }
      case 0x05: { // BNE
        const offset = (imm << 20) >> 20;
        if (this.registers[rs] !== this.registers[rt]) {
          this.programCounter += offset;
        }
        break;
      }

      case 0x02: { // J (Jump)
        const offset = (imm << 20) >> 20;
        this.programCounter += offset;
        break;
      }

      case 0x50: { // PUSH
        this.stackPointer -= 4;
        this.write32(this.stackPointer, this.registers[rs]);
        break;
      }
      case 0x51: { // POP
        this.registers[rd] = this.read32(this.stackPointer);
        this.stackPointer += 4;
        break;
      }

      case 0xFF: // HALT
        return 2;
      default:
        return 1;
    }
    return 0;
  }
}
