export type Token =
  | { type: "instruction"; value: string }
  | { type: "register"; value: number }
  | { type: "immediate"; value: number }
  | { type: "comma" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "newline" }
  | { type: "eof" };

export class Lexer {
    public constructor(private source: string) {}

    public nextToken(): Token {
        this.skipWhitespace();
        
        if (this.isEof()) {
            return { type: "eof" };
        }
        
        if (this.peek() === '\n') {
            this.next();
            return { type: "newline" };
        }
        
        if (this.peek() === ';') {
            this.skipLine();
            return this.nextToken();
        }
        
        if (this.peek() === ',') {
            this.next();
            return { type: "comma" };
        }
        
        if (this.peek() === '(') {
            this.next();
            return { type: "lparen" };
        }
        
        if (this.peek() === ')') {
            this.next();
            return { type: "rparen" };
        }
        
        const word = this.readWord();
        
        if (word.match(/^r([0-9]|1[0-5])$/)) {
            const num = parseInt(word.slice(1));
            return { type: "register", value: num };
        }
        
        if (word.match(/^-?[0-9]+$/) || word.match(/^0x[0-9a-fA-F]+$/)) {
            const value = word.startsWith('0x') 
                ? parseInt(word, 16) 
                : parseInt(word, 10);
            return { type: "immediate", value };
        }
        
        return { type: "instruction", value: word.toUpperCase() };
    }

    private isEof(): boolean {
        return this.source.length === 0;
    }

    private skipWhitespace() {
        while (this.peek() === ' ' || this.peek() === '\t') {
            this.next();
        }
    }

    private skipLine() {
        while (this.peek() !== null && this.peek() !== '\n') {
            this.next();
        }
        if (this.peek() === '\n') {
            this.next();
        }
    }

    private readWord(): string {
        let word = '';
        while (true) {
            const ch = this.peek();
            if (ch === null || ' \t,();\n'.includes(ch)) {
                break;
            }
            word += this.next();
        }
        return word;
    }

    private peek(offset = 0) {
        const char = this.source.charAt(offset);
        return char === "" ? null : char;
    }

    private next() {
        const first = this.peek();

        if (first === null) {
            return null;
        }

        this.source = this.source.slice(1);
        
        return first;
    }
}
