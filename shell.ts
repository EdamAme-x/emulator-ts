import { Assembler } from "./asm/index.ts";
import { CPU, type CPUState } from "./cpu/index.ts";
import { PERM_READ, PERM_WRITE, FSHelper, initFS } from "./fs/index.ts";
import { renderDebugger } from "./debugger.tsx";

const HELP_TEXT = `
Available commands:
  run <code> [@addr]  - Compile and run assembly code (optional: load at address)
  mem <addr>          - Show memory at address (hex)
  reg                 - Show all registers
  reset               - Reset CPU state (clear registers and PC)
  verbose [MS]        - Toggle verbose mode (MS = delay in milliseconds, default 500)
  
  ls                  - List files
  cat <file>          - Show file contents
  echo <text> > <file> - Write text to file
  rm <file>           - Delete file
  chmod <file> <r|w|rw> - Change file permissions
  
  help                - Show this help
  exit                - Exit shell

Examples:
  run LUI r1, 5; ADD r2, r1, r0; HALT  - Load and execute at PC=0
  run LUI r3, 10; HALT @0x100          - Load at address 0x100
  verbose 2000                         - Set 2 second delay per step
  echo Hello > test.txt
  cat test.txt
`;

export class Shell {
  private cpu = new CPU();
  private asm = new Assembler();
  private fs: FSHelper;
  private verbose = false;
  private maxHistory = 1000;
  private stepDelay = 500;

  constructor(options?: { verbose?: boolean; maxHistory?: number }) {
    initFS(this.cpu.getMemory());
    this.fs = new FSHelper(this.cpu.getMemory());
    
    if (options?.verbose) {
      this.verbose = true;
    }
    if (options?.maxHistory) {
      this.maxHistory = options.maxHistory;
    }
  }

  async start() {
    console.log("=== Emulator Shell ===");
    console.log("Type 'help' for available commands");
    if (this.verbose) {
      console.log(`Verbose mode: ON (max history: ${this.maxHistory})`);
    }
    console.log();

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
        } else if (trimmed === "verbose" || trimmed.startsWith("verbose ")) {
          const parts = trimmed.split(" ");
          if (parts.length >= 2) {
            const arg1 = parseInt(parts[1]);
            if (!isNaN(arg1) && arg1 > 0) {
              if (parts.length === 3) {
                const arg2 = parseInt(parts[2]);
                if (!isNaN(arg2) && arg2 > 0) {
                  this.maxHistory = arg1;
                  this.stepDelay = arg2;
                }
              } else {
                this.stepDelay = arg1;
              }
            }
          }
          this.verbose = !this.verbose;
          console.log(`Verbose mode: ${this.verbose ? "ON" : "OFF"} (delay: ${this.stepDelay}ms, max history: ${this.maxHistory})`);
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
          await this.runCode(code);
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

  private async runCode(code: string) {
    try {
      let loadAddr = 0;
      let actualCode = code;
      
      const atMatch = code.match(/@(0x[0-9a-fA-F]+|\d+)$/);
      if (atMatch) {
        loadAddr = atMatch[1].startsWith("0x") 
          ? parseInt(atMatch[1], 16) 
          : parseInt(atMatch[1]);
        actualCode = code.substring(0, atMatch.index).trim();
      }
      
      const source = actualCode.replace(/;/g, "\n");
      const sourceLines = source.split("\n").map(l => l.trim()).filter(l => l);
      const binary = this.asm.compile(source);
      
      this.cpu.setStepCallback(undefined);
      this.cpu.loadMemory(binary, loadAddr);
      
      const oldPC = this.cpu.getPC();
      if (loadAddr !== oldPC) {
        console.log(`\nLoaded ${binary.length} bytes at 0x${loadAddr.toString(16).padStart(4, "0")}`);
        console.log(`Current PC: 0x${oldPC.toString(16).padStart(4, "0")}`);
        console.log(`Use 'run J ${loadAddr}; HALT' to jump to loaded code, or it will continue from current PC\n`);
      }
      
      if (this.verbose) {
        console.log("\n=== Assembly Source ===");
        sourceLines.forEach((line, i) => {
          const addr = loadAddr + (i * 4);
          console.log(`  0x${addr.toString(16).padStart(4, "0")}: ${line}`);
        });
        console.log("\nPress Enter to start execution...");
        await new Promise(resolve => {
          const stdin = Deno.stdin;
          const buf = new Uint8Array(1);
          stdin.read(buf).then(() => resolve(null));
        });
        
        const states: CPUState[] = [];
        let stepCount = 0;
        
        this.cpu.setStepCallback((state) => {
          states.push(state);
          stepCount++;
          
          console.clear();
          console.log("=== Assembly Source ===");
          sourceLines.forEach((line, i) => {
            const addr = loadAddr + (i * 4);
            const isCurrent = state.pc === addr;
            const marker = isCurrent ? "→" : " ";
            const color = isCurrent ? "\x1b[32m" : "\x1b[90m";
            const reset = "\x1b[0m";
            console.log(`${color}${marker} 0x${addr.toString(16).padStart(4, "0")}: ${line}${reset}`);
          });
          
          console.log("\n=== CPU State ===");
          console.log(`PC: 0x${state.pc.toString(16).padStart(4, "0")}  SP: 0x${state.sp.toString(16).padStart(4, "0")}  Step: ${stepCount}`);
          
          console.log("\n=== Registers (Changed in \x1b[43m\x1b[30mYellow\x1b[0m) ===");
          const prev = states[states.length - 2];
          for (let i = 0; i < 16; i += 4) {
            const parts = [];
            for (let j = 0; j < 4; j++) {
              const reg = i + j;
              const val = state.registers[reg];
              const changed = prev && prev.registers[reg] !== val;
              const color = changed ? "\x1b[43m\x1b[30m" : (val === 0 ? "\x1b[90m" : "\x1b[36m");
              const reset = "\x1b[0m";
              parts.push(`r${reg.toString().padStart(2, "0")}: ${color}0x${val.toString(16).padStart(8, "0")}${reset}`);
            }
            console.log(`  ${parts.join("  ")}`);
          }
          
          const lastN = Math.min(5, states.length);
          console.log(`\n=== Last ${lastN} Instructions ===`);
          for (let i = states.length - lastN; i < states.length; i++) {
            if (i < 0) continue;
            const s = states[i];
            const marker = i === states.length - 1 ? "→" : " ";
            console.log(`  ${marker} ${(i + 1).toString().padStart(3, " ")}. PC=0x${s.pc.toString(16).padStart(4, "0")}`);
          }
          
          console.log(`\n\x1b[90m(${this.stepDelay}ms delay per step)\x1b[0m`);
        }, this.stepDelay);
        
        try {
          await this.cpu.start();
        } catch (e) {
          const msg = (e as Error).message;
          if (!msg.includes("Program exited")) {
            this.cpu.setStepCallback(undefined);
            throw e;
          }
        }
        
        this.cpu.setStepCallback(undefined);
        console.log("\n\x1b[32m=== Execution Complete ===\x1b[0m");
      } else {
        try {
          await this.cpu.start();
        } catch (e) {
          const msg = (e as Error).message;
          if (!msg.includes("Program exited")) {
            throw e;
          }
        }
      }
      
      const output = this.cpu.getOutput();
      if (output) {
        console.log("\nOutput:", output);
      }
      
      const exitCode = this.cpu.getExitCode();
      if (exitCode !== null) {
        console.log("Exit code:", exitCode);
      }
      
      console.log("Done\n");
    } catch (e) {
      this.cpu.setStepCallback(undefined);
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
  const args = Deno.args;
  const verbose = args.includes("--verbose") || args.includes("-v");
  const maxHistoryArg = args.find(arg => arg.startsWith("--max-history="));
  const maxHistory = maxHistoryArg ? parseInt(maxHistoryArg.split("=")[1]) : undefined;
  
  const shell = new Shell({ verbose, maxHistory });
  
  if (verbose) {
    console.log(`[Verbose mode enabled${maxHistory ? `, max history: ${maxHistory}` : ""}]`);
  }
  
  await shell.start();
}
