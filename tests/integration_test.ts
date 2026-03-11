import { assertEquals } from "jsr:@std/assert";
import { Assembler } from "../asm/index.ts";
import { CPU } from "../cpu/index.ts";

Deno.test("Integration - sum from 1 to 10", async () => {
  const source = `
LUI r1, 10
LUI r2, 0
LUI r3, 1
ADD r2, r2, r1
SUB r1, r1, r3
BNE r1, r0, -12
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getRegister(1), 0);
  assertEquals(cpu.getRegister(2), 55);
});

Deno.test("Integration - simple addition", async () => {
  const source = `
LUI r1, 5
LUI r2, 3
ADD r3, r1, r2
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getRegister(1), 5);
  assertEquals(cpu.getRegister(2), 3);
  assertEquals(cpu.getRegister(3), 8);
});

Deno.test("Integration - subtraction", async () => {
  const source = `
LUI r1, 10
LUI r2, 3
SUB r3, r1, r2
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getRegister(3), 7);
});

Deno.test("Integration - memory load/store", async () => {
  const source = `
LUI r1, 42
SW r1, 100(r0)
LW r2, 100(r0)
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getRegister(2), 42);
});

Deno.test("Integration - conditional branch BEQ", async () => {
  const source = `
LUI r1, 5
LUI r2, 5
BEQ r1, r2, 8
LUI r3, 99
HALT
LUI r3, 100
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getRegister(3), 100);
});

Deno.test("Integration - unconditional jump", async () => {
  const source = `
J 8
LUI r1, 99
HALT
LUI r1, 100
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getRegister(1), 100);
});
