import { panic } from "../common/panic.ts";

export interface CPUState {
  pc: number;
  sp: number;
  registers: Uint32Array;
  instruction: number;
  decoded: {
    opcode: number;
    rd: number;
    rs: number;
    rt: number;
    imm: number;
  };
}

export interface MemoryChange {
  addr: number;
  value: number;
}

export type CPUStepCallback = (state: CPUState) => void;

export class CPU {
  private programCounter = 0;
  private stackPointer = 0xFFFF;
  private registers = new Uint32Array(16);
  private memory = new Uint8Array(64 * 1024);
  private exitCode: number | null = null;
  private outputBuffer: string[] = [];
  private stepCallback?: CPUStepCallback;
  private stepDelay = 0;
  private memoryWrites: MemoryChange[] = [];

  private read32(addr: number) {
    if (addr < 0 || addr > this.memory.length - 4) {
      throw panic(`Memory access out of bounds: 0x${addr.toString(16)}`);
    }
    const m = this.memory;
    const [b0, b1, b2, b3] = [m[addr], m[addr + 1], m[addr + 2], m[addr + 3]];
    return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  }

  private write32(addr: number, value: number) {
    if (addr < 0 || addr > this.memory.length - 4) {
      throw panic(`Memory access out of bounds: 0x${addr.toString(16)}`);
    }
    const m = this.memory;
    const bytes = [
      value >>> 24,
      (value >>> 16) & 0xFF,
      (value >>> 8) & 0xFF,
      value & 0xFF,
    ];
    
    for (let i = 0; i < 4; i++) {
      m[addr + i] = bytes[i];
      this.memoryWrites.push({ addr: addr + i, value: bytes[i] });
    }
  }

  public reset() {
    this.programCounter = 0;
    this.stackPointer = 0xFFFF;
    this.registers.fill(0);
    this.exitCode = null;
    this.outputBuffer = [];
  }

  public setStepCallback(callback: CPUStepCallback | undefined, delayMs = 0) {
    this.stepCallback = callback;
    this.stepDelay = delayMs;
  }

  public getPC(): number {
    return this.programCounter;
  }

  public getSP(): number {
    return this.stackPointer;
  }

  public loadMemory(binary: Uint8Array, offset = 0) {
    this.memory.set(binary, offset);
  }

  public getRegister(index: number): number {
    return this.registers[index];
  }

  public getExitCode(): number | null {
    return this.exitCode;
  }

  public getOutput(): string {
    return this.outputBuffer.join("");
  }

  public getMemoryByte(addr: number): number {
    if (addr < 0 || addr >= this.memory.length) {
      throw new Error(`Invalid memory address: 0x${addr.toString(16)}`);
    }
    return this.memory[addr];
  }

  public async start() {
    while (true) {
      const inst = this.read32(this.programCounter);
      const opcode = inst >>> 24;
      const rd = (inst >>> 20) & 0xF;
      const rs = (inst >>> 16) & 0xF;
      const rt = (inst >>> 12) & 0xF;
      const imm = inst & 0xFFF;

      if (this.stepCallback) {
        this.stepCallback({
          pc: this.programCounter,
          sp: this.stackPointer,
          registers: new Uint32Array(this.registers),
          instruction: inst,
          decoded: { opcode, rd, rs, rt, imm }
        });
        
        if (this.stepDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.stepDelay));
        }
      }

      this.memoryWrites = [];
      
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

  public getLastMemoryWrites(): MemoryChange[] {
    return this.memoryWrites;
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

      case 0xFC: { // SYSCALL
        this.handleSyscall();
        break;
      }

      case 0xFF: // HALT
        return 2;
      default:
        return 1;
    }
    return 0;
  }

  private handleSyscall() {
    const syscallNumber = this.registers[0];

    switch (syscallNumber) {
      case 0: { // exit(code)
        const code = this.registers[1];
        this.exitCode = code;
        throw new Error(`Program exited with code: ${code}`);
      }

      case 1: { // print(addr, len)
        const addr = this.registers[1];
        const len = this.registers[2];
        
        if (addr < 0 || addr + len > this.memory.length) {
          throw panic(`Invalid memory range for print: ${addr}-${addr + len}`);
        }

        let str = "";
        for (let i = 0; i < len; i++) {
          str += String.fromCharCode(this.memory[addr + i]);
        }
        this.outputBuffer.push(str);
        break;
      }

      case 2: { // print_num(value)
        const value = this.registers[1];
        this.outputBuffer.push(value.toString());
        break;
      }

      default:
        throw panic(`Unknown syscall: ${syscallNumber}`);
    }
  }

  private readString(addr: number, len: number): string {
    if (addr < 0 || addr + len > this.memory.length) {
      throw panic(`Invalid memory range: ${addr}-${addr + len}`);
    }

    let str = "";
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(this.memory[addr + i]);
    }
    return str;
  }

  public getMemory(): Uint8Array {
    return this.memory;
  }
}
