import { assertEquals } from "jsr:@std/assert";
import { Parser } from "../asm/parser.ts";

Deno.test("Parser - LUI instruction", () => {
  const parser = new Parser("LUI r1, 10");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x13,
    rd: 1,
    rs: 0,
    rt: 0,
    imm: 10,
  });
});

Deno.test("Parser - ADD instruction", () => {
  const parser = new Parser("ADD r2, r1, r3");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x00,
    rd: 2,
    rs: 1,
    rt: 3,
    imm: 0,
  });
});

Deno.test("Parser - SUB instruction", () => {
  const parser = new Parser("SUB r1, r2, r3");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x01,
    rd: 1,
    rs: 2,
    rt: 3,
    imm: 0,
  });
});

Deno.test("Parser - LW instruction", () => {
  const parser = new Parser("LW r1, 8(r2)");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x23,
    rd: 1,
    rs: 2,
    rt: 0,
    imm: 8,
  });
});

Deno.test("Parser - SW instruction", () => {
  const parser = new Parser("SW r1, 4(r2)");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x2B,
    rd: 1,
    rs: 2,
    rt: 0,
    imm: 4,
  });
});

Deno.test("Parser - BEQ instruction", () => {
  const parser = new Parser("BEQ r1, r2, -8");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x04,
    rd: 0,
    rs: 1,
    rt: 2,
    imm: -8,
  });
});

Deno.test("Parser - BNE instruction", () => {
  const parser = new Parser("BNE r1, r0, -8");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x05,
    rd: 0,
    rs: 1,
    rt: 0,
    imm: -8,
  });
});

Deno.test("Parser - J instruction", () => {
  const parser = new Parser("J 100");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x02,
    rd: 0,
    rs: 0,
    rt: 0,
    imm: 100,
  });
});

Deno.test("Parser - PUSH instruction", () => {
  const parser = new Parser("PUSH r1");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x50,
    rd: 0,
    rs: 1,
    rt: 0,
    imm: 0,
  });
});

Deno.test("Parser - POP instruction", () => {
  const parser = new Parser("POP r1");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0x51,
    rd: 1,
    rs: 0,
    rt: 0,
    imm: 0,
  });
});

Deno.test("Parser - HALT instruction", () => {
  const parser = new Parser("HALT");
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 1);
  assertEquals(instructions[0], {
    opcode: 0xFF,
    rd: 0,
    rs: 0,
    rt: 0,
    imm: 0,
  });
});

Deno.test("Parser - multiple instructions", () => {
  const parser = new Parser(`
LUI r1, 10
ADD r2, r1, r3
HALT
`);
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 3);
  assertEquals(instructions[0].opcode, 0x13);
  assertEquals(instructions[1].opcode, 0x00);
  assertEquals(instructions[2].opcode, 0xFF);
});

Deno.test("Parser - with comments", () => {
  const parser = new Parser(`
; This is a comment
LUI r1, 10
; Another comment
HALT
`);
  const instructions = parser.parse();
  
  assertEquals(instructions.length, 2);
});
