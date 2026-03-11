# Emulator TypeScript

A simple CPU emulator with assembly language support, syscalls, and a permission-based filesystem.

## Features

- Custom 32-bit RISC-like CPU
- MIPS-inspired instruction set
- System calls for I/O and file operations
- Permission-based filesystem (read/write)
- Interactive shell with filesystem commands
- Assembly compiler

## Quick Start

```bash
deno task start
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

### General
- `help` - Show help
- `exit` - Exit shell

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

> cat test.txt
Hello, World!

> echo Try write > test.txt
Error: Permission denied: test.txt (no write permission)
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
| 10 | fs_create | r1: path_addr, r2: path_len, r3: content_addr, r4: content_len, r5: perms | Create file |
| 11 | fs_read | r1: path_addr, r2: path_len, r3: buf_addr, r4: buf_size | Read file (returns length in r1) |
| 12 | fs_write | r1: path_addr, r2: path_len, r3: content_addr, r4: content_len | Write file |
| 13 | fs_list | r1: buf_addr, r2: buf_size | List files (returns count in r1) |
| 14 | fs_delete | r1: path_addr, r2: path_len | Delete file |
| 15 | fs_chmod | r1: path_addr, r2: path_len, r3: perms | Change permissions |

### Permissions
- `0b01` (1) - Read
- `0b10` (2) - Write
- `0b11` (3) - Read + Write

## Example

```assembly
LUI r0, 2
LUI r1, 42
SYSCALL
HALT
```

## Testing

```bash
deno test
```

## Development

```bash
deno task dev
```
