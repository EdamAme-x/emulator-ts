import { Assembler } from "./asm/index.ts";
import { CPU } from "./cpu/index.ts";
import { PERM_READ, PERM_WRITE, FSHelper, initFS } from "./fs/index.ts";

const HELP_TEXT = `
Available commands:
  run <code>     - Compile and run assembly code
  mem <addr>     - Show memory at address (hex)
  reg            - Show all registers
  reset          - Reset CPU state
  
  ls             - List files
  cat <file>     - Show file contents
  echo <text> > <file> - Write text to file
  rm <file>      - Delete file
  chmod <file> <r|w|rw> - Change file permissions
  
  help           - Show this help
  exit           - Exit shell

Examples:
  echo Hello > test.txt
  cat test.txt
  ls
  chmod test.txt r
`;

export class Shell {
  private cpu = new CPU();
  private asm = new Assembler();
  private fs: FSHelper;

  constructor() {
    initFS(this.cpu.getMemory());
    this.fs = new FSHelper(this.cpu.getMemory());
  }

  async start() {
    console.log("=== Emulator Shell ===");
    console.log("Type 'help' for available commands\n");

    while (true) {
      const input = prompt("> ");
      
      if (!input) continue;

      const trimmed = input.trim();
      if (!trimmed) continue;

      try {
        if (trimmed === "exit") {
          console.log("Goodbye!");
          break;
        } else if (trimmed === "help") {
          console.log(HELP_TEXT);
        } else if (trimmed === "reset") {
          this.cpu.reset();
          console.log("CPU reset");
        } else if (trimmed === "reg") {
          this.showRegisters();
        } else if (trimmed === "ls") {
          this.listFiles();
        } else if (trimmed.startsWith("cat ")) {
          const file = trimmed.slice(4);
          this.catFile(file);
        } else if (trimmed.includes(" > ")) {
          const [text, file] = trimmed.split(" > ");
          const content = text.startsWith("echo ") ? text.slice(5) : text;
          this.echoFile(content, file);
        } else if (trimmed.startsWith("rm ")) {
          const file = trimmed.slice(3);
          this.removeFile(file);
        } else if (trimmed.startsWith("chmod ")) {
          const parts = trimmed.slice(6).split(" ");
          if (parts.length === 2) {
            this.chmodFile(parts[0], parts[1]);
          } else {
            console.log("Usage: chmod <file> <r|w|rw>");
          }
        } else if (trimmed.startsWith("mem ")) {
          const addr = parseInt(trimmed.slice(4), 16);
          this.showMemory(addr);
        } else if (trimmed.startsWith("run ")) {
          const code = trimmed.slice(4);
          this.runCode(code);
        } else {
          console.log(`Unknown command: ${trimmed.split(" ")[0]}`);
          console.log("Type 'help' for available commands");
        }
      } catch (e) {
        console.error("Error:", (e as Error).message);
      }

      console.log();
    }
  }

  private runCode(code: string) {
    try {
      const source = code.replace(/;/g, "\n");
      const binary = this.asm.compile(source);
      
      this.cpu.reset();
      this.cpu.loadMemory(binary);
      
      try {
        this.cpu.start();
      } catch (e) {
        const msg = (e as Error).message;
        if (!msg.includes("Program exited")) {
          throw e;
        }
      }
      
      const output = this.cpu.getOutput();
      if (output) {
        console.log("Output:", output);
      }
      
      const exitCode = this.cpu.getExitCode();
      if (exitCode !== null) {
        console.log("Exit code:", exitCode);
      }
      
      console.log("Done");
    } catch (e) {
      throw new Error(`Compilation/execution failed: ${(e as Error).message}`);
    }
  }

  private showRegisters() {
    console.log("Registers:");
    for (let i = 0; i < 16; i++) {
      const value = this.cpu.getRegister(i);
      console.log(`  r${i.toString().padStart(2, " ")}: 0x${value.toString(16).padStart(8, "0")} (${value})`);
    }
  }

  private showMemory(addr: number) {
    console.log(`Memory at 0x${addr.toString(16).padStart(4, "0")}:`);
    for (let row = 0; row < 16; row++) {
      const rowAddr = addr + (row * 4);
      const bytes = [];
      for (let i = 0; i < 4; i++) {
        try {
          const byte = this.cpu.getMemoryByte(rowAddr + i);
          bytes.push(byte.toString(16).padStart(2, "0"));
        } catch {
          bytes.push("??");
        }
      }
      console.log(`  0x${rowAddr.toString(16).padStart(4, "0")}: ${bytes.join(" ")}`);
    }
  }

  private listFiles() {
    const files = this.fs.listFiles();
    
    if (files.length === 0) {
      console.log("No files");
      return;
    }

    console.log("Files:");
    for (const file of files) {
      const perms = [];
      if (file.perms & PERM_READ) perms.push("r");
      if (file.perms & PERM_WRITE) perms.push("w");
      const permStr = perms.join("") || "-";
      console.log(`  ${permStr.padEnd(3)} ${file.name}`);
    }
  }

  private catFile(path: string) {
    const content = this.fs.readFile(path);
    console.log(content);
  }

  private echoFile(content: string, path: string) {
    try {
      this.fs.writeFile(path, content);
      console.log(`Written to ${path}`);
    } catch (e) {
      const err = e as Error;
      if (err.message.includes("File not found")) {
        this.fs.createFile(path, content, PERM_READ | PERM_WRITE);
        console.log(`Written to ${path}`);
      } else {
        throw e;
      }
    }
  }

  private removeFile(path: string) {
    this.fs.deleteFile(path);
    console.log(`Deleted ${path}`);
  }

  private chmodFile(path: string, perms: string) {
    let permBits = 0;
    if (perms.includes("r")) permBits |= PERM_READ;
    if (perms.includes("w")) permBits |= PERM_WRITE;
    
    this.fs.chmod(path, permBits);
    console.log(`Changed permissions of ${path} to ${perms}`);
  }
}

if (import.meta.main) {
  const shell = new Shell();
  await shell.start();
}
