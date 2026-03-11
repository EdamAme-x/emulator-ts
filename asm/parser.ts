import { Lexer, Token } from "./lexer.ts";

export interface Instruction {
  opcode: number;
  rd: number;
  rs: number;
  rt: number;
  imm: number;
}

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;

  constructor(source: string) {
    this.lexer = new Lexer(source);
    this.currentToken = this.lexer.nextToken();
  }

  public parse(): Instruction[] {
    const instructions: Instruction[] = [];

    while (this.currentToken.type !== "eof") {
      if (this.currentToken.type === "newline") {
        this.advance();
        continue;
      }

      if (this.currentToken.type === "instruction") {
        instructions.push(this.parseInstruction());
      } else {
        throw new Error(`Unexpected token: ${this.currentToken.type}`);
      }
    }

    return instructions;
  }

  private parseInstruction(): Instruction {
    if (this.currentToken.type !== "instruction") {
      throw new Error("Expected instruction");
    }
    const mnemonic = this.currentToken.value;
    this.advance();

    switch (mnemonic) {
      case "ADD":
      case "SUB": {
        const rd = this.expectRegister();
        this.expect("comma");
        const rs = this.expectRegister();
        this.expect("comma");
        const rt = this.expectRegister();
        return {
          opcode: mnemonic === "ADD" ? 0x00 : 0x01,
          rd,
          rs,
          rt,
          imm: 0,
        };
      }

      case "LUI": {
        const rd = this.expectRegister();
        this.expect("comma");
        const imm = this.expectImmediate();
        return {
          opcode: 0x13,
          rd,
          rs: 0,
          rt: 0,
          imm,
        };
      }

      case "LW": {
        const rd = this.expectRegister();
        this.expect("comma");
        const { offset, register } = this.parseMemoryOperand();
        return {
          opcode: 0x23,
          rd,
          rs: register,
          rt: 0,
          imm: offset,
        };
      }

      case "SW": {
        const rd = this.expectRegister();
        this.expect("comma");
        const { offset, register } = this.parseMemoryOperand();
        return {
          opcode: 0x2B,
          rd,
          rs: register,
          rt: 0,
          imm: offset,
        };
      }

      case "BEQ":
      case "BNE": {
        const rs = this.expectRegister();
        this.expect("comma");
        const rt = this.expectRegister();
        this.expect("comma");
        const imm = this.expectImmediate();
        return {
          opcode: mnemonic === "BEQ" ? 0x04 : 0x05,
          rd: 0,
          rs,
          rt,
          imm,
        };
      }

      case "J": {
        const imm = this.expectImmediate();
        return {
          opcode: 0x02,
          rd: 0,
          rs: 0,
          rt: 0,
          imm,
        };
      }

      case "PUSH": {
        const rs = this.expectRegister();
        return {
          opcode: 0x50,
          rd: 0,
          rs,
          rt: 0,
          imm: 0,
        };
      }

      case "POP": {
        const rd = this.expectRegister();
        return {
          opcode: 0x51,
          rd,
          rs: 0,
          rt: 0,
          imm: 0,
        };
      }

      case "HALT": {
        return {
          opcode: 0xFF,
          rd: 0,
          rs: 0,
          rt: 0,
          imm: 0,
        };
      }

      default:
        throw new Error(`Unknown instruction: ${mnemonic}`);
    }
  }

  private parseMemoryOperand(): { offset: number; register: number } {
    const imm = this.expectImmediate();
    this.expect("lparen");
    const register = this.expectRegister();
    this.expect("rparen");
    return { offset: imm, register };
  }

  private advance() {
    this.currentToken = this.lexer.nextToken();
  }

  private expect(type: Token["type"]): Token {
    if (this.currentToken.type !== type) {
      throw new Error(
        `Expected ${type}, got ${this.currentToken.type}`,
      );
    }
    const token = this.currentToken;
    this.advance();
    return token;
  }

  private expectRegister(): number {
    const token = this.expect("register");
    if (token.type === "register") {
      return token.value;
    }
    throw new Error("Expected register");
  }

  private expectImmediate(): number {
    const token = this.expect("immediate");
    if (token.type === "immediate") {
      return token.value;
    }
    throw new Error("Expected immediate");
  }
}
