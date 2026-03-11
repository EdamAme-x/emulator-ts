import { assertEquals } from "jsr:@std/assert";
import { Lexer } from "../asm/lexer.ts";

Deno.test("Lexer - basic tokens", () => {
  const lexer = new Lexer("LUI r1, 10");
  
  assertEquals(lexer.nextToken(), { type: "instruction", value: "LUI" });
  assertEquals(lexer.nextToken(), { type: "register", value: 1 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "immediate", value: 10 });
  assertEquals(lexer.nextToken(), { type: "eof" });
});

Deno.test("Lexer - register tokens", () => {
  const lexer = new Lexer("r0 r5 r15");
  
  assertEquals(lexer.nextToken(), { type: "register", value: 0 });
  assertEquals(lexer.nextToken(), { type: "register", value: 5 });
  assertEquals(lexer.nextToken(), { type: "register", value: 15 });
});

Deno.test("Lexer - negative immediate", () => {
  const lexer = new Lexer("BNE r1, r0, -8");
  
  assertEquals(lexer.nextToken(), { type: "instruction", value: "BNE" });
  assertEquals(lexer.nextToken(), { type: "register", value: 1 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "register", value: 0 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "immediate", value: -8 });
});

Deno.test("Lexer - hex immediate", () => {
  const lexer = new Lexer("LUI r1, 0x10");
  
  assertEquals(lexer.nextToken(), { type: "instruction", value: "LUI" });
  assertEquals(lexer.nextToken(), { type: "register", value: 1 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "immediate", value: 16 });
});

Deno.test("Lexer - comments", () => {
  const lexer = new Lexer("; comment\nLUI r1, 10");
  
  assertEquals(lexer.nextToken(), { type: "instruction", value: "LUI" });
  assertEquals(lexer.nextToken(), { type: "register", value: 1 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "immediate", value: 10 });
});

Deno.test("Lexer - ADD instruction", () => {
  const lexer = new Lexer("ADD r2, r2, r1");
  
  assertEquals(lexer.nextToken(), { type: "instruction", value: "ADD" });
  assertEquals(lexer.nextToken(), { type: "register", value: 2 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "register", value: 2 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "register", value: 1 });
});

Deno.test("Lexer - memory operand", () => {
  const lexer = new Lexer("LW r1, 8(r2)");
  
  assertEquals(lexer.nextToken(), { type: "instruction", value: "LW" });
  assertEquals(lexer.nextToken(), { type: "register", value: 1 });
  assertEquals(lexer.nextToken(), { type: "comma" });
  assertEquals(lexer.nextToken(), { type: "immediate", value: 8 });
  assertEquals(lexer.nextToken(), { type: "lparen" });
  assertEquals(lexer.nextToken(), { type: "register", value: 2 });
  assertEquals(lexer.nextToken(), { type: "rparen" });
});
