# Filesystem Assembly Library

This file documents the filesystem layout and provides assembly routines for file operations.

## Memory Layout

```
FS_BASE     = 0x8000
INODE_TABLE = 0x8000       (64 inodes × 64 bytes)
DIR_ENTRIES = 0x9000       (64 entries × 32 bytes)
DATA_BLOCKS = 0x9800       (256 blocks × 256 bytes)
```

## Inode Structure (64 bytes at INODE_TABLE + inode_num * 64)

```
+0:  size (4 bytes, little-endian)
+4:  block_num (4 bytes, little-endian)
+8:  permissions (1 byte: 0b01=read, 0b10=write)
+9:  used (1 byte: 0=free, 1=used)
```

## Directory Entry (32 bytes at DIR_ENTRIES + entry_num * 32)

```
+0:  filename (28 bytes, null-terminated)
+28: inode_num (4 bytes, little-endian)
```

## Data Block (256 bytes at DATA_BLOCKS + block_num * 256)

Raw file data.

## Assembly Helper Functions

### Find Free Inode
```assembly
; Returns: r1 = inode number, or 0xFFFFFFFF if none
LUI r10, 0x8000        ; INODE_TABLE base
LUI r11, 64            ; MAX_INODES
LUI r12, 0             ; counter

find_inode_loop:
  LUI r13, 64
  MUL r13, r12, r13    ; offset = counter * 64
  ADD r13, r10, r13    ; addr = base + offset
  LW r14, 9(r13)       ; load used flag
  BEQ r14, r0, found_inode
  
  ADD r12, r12, 1
  BNE r12, r11, find_inode_loop
  
  LUI r1, 0xFFFFFFFF   ; not found
  J done

found_inode:
  LUI r1, r12          ; return inode number
done:
```

### Find Directory Entry by Name
```assembly
; Input: r1 = name_addr, r2 = name_len
; Returns: r1 = entry index, or 0xFFFFFFFF if not found

LUI r10, 0x9000        ; DIR_ENTRIES base
LUI r11, 64            ; MAX_ENTRIES
LUI r12, 0             ; counter

find_entry_loop:
  LUI r13, 32
  MUL r13, r12, r13    ; offset = counter * 32
  ADD r13, r10, r13    ; addr = base + offset
  
  ; Compare name (simplified, needs actual strcmp)
  LW r14, 0(r13)       ; load first 4 bytes
  ; ... comparison logic ...
  
  ADD r12, r12, 1
  BNE r12, r11, find_entry_loop
  
  LUI r1, 0xFFFFFFFF   ; not found
```

## Syscall Interface

Use existing syscalls (10-15) which now operate directly on memory at FS_BASE.

The syscalls are thin wrappers that:
1. Validate addresses
2. Call memory operations
3. Return status codes

All actual FS logic can be implemented in pure assembly by directly manipulating memory at FS_BASE.
