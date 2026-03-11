import { Assembler } from "./asm/index.ts";
import { CPU } from "./cpu/index.ts";

const source = `
; Sum from 1 to 10
LUI r1, 10
LUI r2, 0
LUI r3, 1
ADD r2, r2, r1
SUB r1, r1, r3
BNE r1, r0, -12
HALT
`;

console.log("=== Assembly Source ===");
console.log(source);

const asm = new Assembler();
const binary = asm.compile(source);

console.log("\n=== Binary (hex) ===");
for (let i = 0; i < binary.length; i += 4) {
  const inst = (binary[i] << 24) | (binary[i+1] << 16) | (binary[i+2] << 8) | binary[i+3];
  console.log(`0x${i.toString(16).padStart(4, "0")}: 0x${inst.toString(16).padStart(8, "0")}`);
}

const cpu = new CPU();
cpu.loadMemory(binary);

console.log("\n=== Running CPU ===");
cpu.start();

console.log("\n=== Registers ===");
console.log("r1:", cpu.getRegister(1));
console.log("r2:", cpu.getRegister(2));
