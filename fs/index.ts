export const PERM_READ = 0b01;
export const PERM_WRITE = 0b10;

export const FS_BASE = 0x8000;
export const INODE_SIZE = 64;
export const BLOCK_SIZE = 256;
export const MAX_INODES = 64;
export const MAX_BLOCKS = 256;
export const MAX_FILENAME = 28;

export const INODE_TABLE = FS_BASE;
export const DIR_ENTRIES = INODE_TABLE + (INODE_SIZE * MAX_INODES);
export const DATA_BLOCKS = DIR_ENTRIES + (32 * MAX_INODES);

export function initFS(memory: Uint8Array) {
  const view = new DataView(memory.buffer);
  
  for (let i = 0; i < MAX_INODES; i++) {
    const addr = INODE_TABLE + (i * INODE_SIZE);
    view.setUint8(addr + 9, 0);
  }
  
  for (let i = 0; i < MAX_INODES; i++) {
    const addr = DIR_ENTRIES + (i * 32);
    for (let j = 0; j < 32; j++) {
      memory[addr + j] = 0;
    }
  }
}

export class FSHelper {
  constructor(private memory: Uint8Array) {}

  createFile(name: string, content: string, perms: number) {
    const inode = this.allocInode();
    const block = this.allocBlock();
    const entry = this.allocDirEntry();

    const blockAddr = DATA_BLOCKS + (block * BLOCK_SIZE);
    const contentBytes = new TextEncoder().encode(content);
    const size = Math.min(contentBytes.length, BLOCK_SIZE);
    
    for (let i = 0; i < size; i++) {
      this.memory[blockAddr + i] = contentBytes[i];
    }

    this.writeInode(inode, size, block, perms);
    this.writeDirEntry(entry, name, inode);
  }

  readFile(name: string): string {
    const entryIdx = this.findDirEntry(name);
    if (entryIdx === -1) throw new Error(`File not found: ${name}`);

    const entry = this.readDirEntry(entryIdx);
    const inode = this.readInode(entry.inode);

    if (!(inode.perms & PERM_READ)) {
      throw new Error(`Permission denied: ${name}`);
    }

    const blockAddr = DATA_BLOCKS + (inode.block * BLOCK_SIZE);
    const bytes = this.memory.slice(blockAddr, blockAddr + inode.size);
    return new TextDecoder().decode(bytes);
  }

  writeFile(name: string, content: string) {
    const entryIdx = this.findDirEntry(name);
    if (entryIdx === -1) throw new Error(`File not found: ${name}`);

    const entry = this.readDirEntry(entryIdx);
    const inode = this.readInode(entry.inode);

    if (!(inode.perms & PERM_WRITE)) {
      throw new Error(`Permission denied: ${name}`);
    }

    const blockAddr = DATA_BLOCKS + (inode.block * BLOCK_SIZE);
    const contentBytes = new TextEncoder().encode(content);
    const size = Math.min(contentBytes.length, BLOCK_SIZE);
    
    for (let i = 0; i < size; i++) {
      this.memory[blockAddr + i] = contentBytes[i];
    }

    this.writeInode(entry.inode, size, inode.block, inode.perms);
  }

  listFiles(): Array<{ name: string; perms: number }> {
    const files = [];
    
    for (let i = 0; i < MAX_INODES; i++) {
      const entry = this.readDirEntry(i);
      if (entry.name && entry.name !== "/") {
        const inode = this.readInode(entry.inode);
        files.push({ name: entry.name, perms: inode.perms });
      }
    }
    
    return files;
  }

  deleteFile(name: string) {
    const entryIdx = this.findDirEntry(name);
    if (entryIdx === -1) throw new Error(`File not found: ${name}`);

    const entry = this.readDirEntry(entryIdx);
    const inode = this.readInode(entry.inode);

    if (!(inode.perms & PERM_WRITE)) {
      throw new Error(`Permission denied: ${name}`);
    }

    this.writeDirEntry(entryIdx, "", 0);
  }

  chmod(name: string, perms: number) {
    const entryIdx = this.findDirEntry(name);
    if (entryIdx === -1) throw new Error(`File not found: ${name}`);

    const entry = this.readDirEntry(entryIdx);
    const inode = this.readInode(entry.inode);

    this.writeInode(entry.inode, inode.size, inode.block, perms);
  }

  private allocInode(): number {
    for (let i = 0; i < MAX_INODES; i++) {
      const addr = INODE_TABLE + (i * INODE_SIZE);
      if (this.memory[addr + 9] === 0) return i;
    }
    throw new Error("No free inodes");
  }

  private allocBlock(): number {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      let used = false;
      for (let j = 0; j < MAX_INODES; j++) {
        const inode = this.readInode(j);
        if (inode.used && inode.block === i) {
          used = true;
          break;
        }
      }
      if (!used) return i;
    }
    throw new Error("No free blocks");
  }

  private allocDirEntry(): number {
    for (let i = 0; i < MAX_INODES; i++) {
      const entry = this.readDirEntry(i);
      if (entry.name === "") return i;
    }
    throw new Error("No free directory entries");
  }

  private findDirEntry(name: string): number {
    for (let i = 0; i < MAX_INODES; i++) {
      const entry = this.readDirEntry(i);
      if (entry.name === name) return i;
    }
    return -1;
  }

  private writeInode(inode: number, size: number, block: number, perms: number) {
    const addr = INODE_TABLE + (inode * INODE_SIZE);
    const view = new DataView(this.memory.buffer);
    
    view.setUint32(addr, size, true);
    view.setUint32(addr + 4, block, true);
    view.setUint8(addr + 8, perms);
    view.setUint8(addr + 9, 1);
  }

  private readInode(inode: number) {
    const addr = INODE_TABLE + (inode * INODE_SIZE);
    const view = new DataView(this.memory.buffer);
    
    return {
      size: view.getUint32(addr, true),
      block: view.getUint32(addr + 4, true),
      perms: view.getUint8(addr + 8),
      used: view.getUint8(addr + 9),
    };
  }

  private writeDirEntry(entry: number, name: string, inode: number) {
    const addr = DIR_ENTRIES + (entry * 32);
    const view = new DataView(this.memory.buffer);
    
    for (let i = 0; i < MAX_FILENAME; i++) {
      this.memory[addr + i] = i < name.length ? name.charCodeAt(i) : 0;
    }
    view.setUint32(addr + MAX_FILENAME, inode, true);
  }

  private readDirEntry(entry: number) {
    const addr = DIR_ENTRIES + (entry * 32);
    const view = new DataView(this.memory.buffer);
    
    let name = "";
    for (let i = 0; i < MAX_FILENAME; i++) {
      const byte = this.memory[addr + i];
      if (byte === 0) break;
      name += String.fromCharCode(byte);
    }
    
    return {
      name,
      inode: view.getUint32(addr + MAX_FILENAME, true),
    };
  }
}
