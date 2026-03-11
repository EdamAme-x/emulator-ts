import { assertEquals, assertRejects } from "jsr:@std/assert";
import { Assembler } from "../asm/index.ts";
import { CPU } from "../cpu/index.ts";

Deno.test("Syscall - exit", async () => {
  const source = `
LUI r0, 0
LUI r1, 42
SYSCALL
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);

  await assertRejects(
    async () => await cpu.start(),
    Error,
    "Program exited with code: 42"
  );

  assertEquals(cpu.getExitCode(), 42);
});

Deno.test("Syscall - print_num", async () => {
  const source = `
LUI r0, 2
LUI r1, 123
SYSCALL
LUI r0, 2
LUI r1, 456
SYSCALL
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getOutput(), "123456");
});

Deno.test("Syscall - print string", async () => {
  const asm = new Assembler();
  
  const program = `
LUI r0, 1
LUI r1, 100
LUI r2, 2
SYSCALL
HALT
`;
  
  const binary = asm.compile(program);
  
  const cpu = new CPU();
  cpu.loadMemory(binary);
  
  cpu.loadMemory(new Uint8Array([72, 105]), 100);
  
  await cpu.start();

  assertEquals(cpu.getOutput(), "Hi");
});

Deno.test("Syscall - multiple operations", async () => {
  const source = `
; Print number
LUI r0, 2
LUI r1, 10
SYSCALL

; Print another number
LUI r0, 2
LUI r1, 20
SYSCALL

; Print sum
LUI r3, 10
LUI r4, 20
ADD r5, r3, r4
LUI r0, 2
LUI r1, 30
SYSCALL

HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);
  await cpu.start();

  assertEquals(cpu.getOutput(), "102030");
  assertEquals(cpu.getRegister(5), 30);
});

Deno.test("Syscall - unknown syscall number", async () => {
  const source = `
LUI r0, 99
SYSCALL
HALT
`;

  const asm = new Assembler();
  const binary = asm.compile(source);

  const cpu = new CPU();
  cpu.loadMemory(binary);

  await assertRejects(
    async () => await cpu.start(),
    Error,
    "Unknown syscall: 99"
  );
});
