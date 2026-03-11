# Emulator TypeScript

A simple CPU emulator with assembly language support, syscalls, and a permission-based filesystem with real-time debugging visualization.

## Features

- Custom 32-bit RISC-like CPU
- MIPS-inspired instruction set
- System calls for I/O operations
- Low-level memory-mapped filesystem with permissions
- Interactive shell with filesystem commands
- **Real-time debugger with Ink visualization**
- Assembly compiler (lexer, parser, encoder)

## Quick Start

```bash
# Normal mode
deno task start

# Verbose mode (with debugger)
deno task start -- --verbose

# Verbose mode with custom history size
deno task start -- --verbose --max-history=50
```

## Shell Commands

### File Operations
- `ls` - List all files
- `cat <file>` - Display file contents
- `echo <text> > <file>` - Write text to file
- `rm <file>` - Delete file
- `chmod <file> <r|w|rw>` - Change permissions

### CPU Operations
- `run <code>` - Compile and execute assembly
- `reg` - Show registers
- `mem <addr>` - Show memory at address (hex)
- `reset` - Reset CPU
- `verbose [N]` - Toggle verbose mode (N = max history, default 1000)

### General
- `help` - Show help
- `exit` - Exit shell

## Verbose Mode

When verbose mode is ON (via `--verbose` flag or `verbose` command), the `run` command displays a real-time visualization of CPU execution:

```bash
# Start with verbose mode
deno task start -- --verbose

# Or toggle in shell
> verbose
```

Display features:
- **Current instruction** with decoded fields (opcode, rd, rs, rt, imm)
- **Register state** for all 16 registers (changed values highlighted with white background)
- **Execution history** showing the last N instructions
- **Program Counter (PC)** and **Stack Pointer (SP)** (highlighted when changed)
- Color-coded display with Ink (GEF-inspired color scheme)

```
> verbose 50
Verbose mode: ON (max history: 50)

> run LUI r1, 10; LUI r2, 0; LUI r3, 1; ADD r2, r2, r1; SUB r1, r1, r3; BNE r1, r0, -12; HALT
```

The debugger updates in real-time as instructions execute, showing you exactly how your program runs.

## Examples

### Filesystem Operations
```
> echo Hello, World! > test.txt
Written to test.txt

> cat test.txt
Hello, World!

> ls
Files:
  rw  test.txt

> chmod test.txt r
Changed permissions of test.txt to r

> echo Try write > test.txt
Error: Permission denied: test.txt
```

### Assembly Code
```
> run LUI r0, 2; LUI r1, 42; SYSCALL; HALT
Output: 42
Done
```

## Instruction Set

| Opcode | Instruction | Format | Description |
|--------|-------------|--------|-------------|
| 0x00 | ADD | rd, rs, rt | Add |
| 0x01 | SUB | rd, rs, rt | Subtract |
| 0x02 | J | offset | Jump |
| 0x04 | BEQ | rs, rt, offset | Branch if equal |
| 0x05 | BNE | rs, rt, offset | Branch if not equal |
| 0x13 | LUI | rd, imm | Load upper immediate |
| 0x23 | LW | rd, offset(rs) | Load word |
| 0x2B | SW | rd, offset(rs) | Store word |
| 0x50 | PUSH | rs | Push to stack |
| 0x51 | POP | rd | Pop from stack |
| 0xFC | SYSCALL | - | System call |
| 0xFF | HALT | - | Halt |

## System Calls

| Number | Name | Args | Description |
|--------|------|------|-------------|
| 0 | exit | r1: code | Exit program |
| 1 | print | r1: addr, r2: len | Print string |
| 2 | print_num | r1: value | Print number |

### Permissions
- `0b01` (1) - Read
- `0b10` (2) - Write
- `0b11` (3) - Read + Write

## Architecture

- **CPU**: Pure emulator with 16 registers, 64KB memory
- **Filesystem**: Memory-mapped with inodes, directory entries, and data blocks
- **Shell**: Interactive interface with Deno
- **Debugger**: Real-time Ink-based visualization

## Testing

```bash
deno test
```

All 41 tests passing.
