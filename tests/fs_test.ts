import { assertEquals, assertThrows } from "@std/assert";
import { FSHelper, initFS, PERM_READ, PERM_WRITE } from "../fs/index.ts";

Deno.test("FileSystem - create and read file", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Hello", PERM_READ | PERM_WRITE);
  const content = fs.readFile("test.txt");
  assertEquals(content, "Hello");
});

Deno.test("FileSystem - write to existing file", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Hello", PERM_READ | PERM_WRITE);
  fs.writeFile("test.txt", "World");
  const content = fs.readFile("test.txt");
  assertEquals(content, "World");
});

Deno.test("FileSystem - read permission denied", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Secret", PERM_WRITE);
  assertThrows(
    () => fs.readFile("test.txt"),
    Error,
    "Permission denied"
  );
});

Deno.test("FileSystem - write permission denied", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Read only", PERM_READ);
  assertThrows(
    () => fs.writeFile("test.txt", "New content"),
    Error,
    "Permission denied"
  );
});

Deno.test("FileSystem - list files", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("file1.txt", "A", PERM_READ);
  fs.createFile("file2.txt", "B", PERM_READ | PERM_WRITE);
  
  const files = fs.listFiles();
  assertEquals(files.length, 2);
  assertEquals(files[0].name, "file1.txt");
  assertEquals(files[0].perms, PERM_READ);
  assertEquals(files[1].name, "file2.txt");
  assertEquals(files[1].perms, PERM_READ | PERM_WRITE);
});

Deno.test("FileSystem - delete file", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Delete me", PERM_READ | PERM_WRITE);
  fs.deleteFile("test.txt");
  
  assertThrows(
    () => fs.readFile("test.txt"),
    Error,
    "File not found"
  );
});

Deno.test("FileSystem - delete permission denied", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Protected", PERM_READ);
  assertThrows(
    () => fs.deleteFile("test.txt"),
    Error,
    "Permission denied"
  );
});

Deno.test("FileSystem - chmod", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Content", PERM_READ | PERM_WRITE);
  fs.chmod("test.txt", PERM_READ);
  
  assertThrows(
    () => fs.writeFile("test.txt", "New"),
    Error,
    "Permission denied"
  );
  
  const content = fs.readFile("test.txt");
  assertEquals(content, "Content");
});

Deno.test("FileSystem - file not found", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  assertThrows(
    () => fs.readFile("nonexistent.txt"),
    Error,
    "File not found"
  );
});

Deno.test("FileSystem - echo to readonly file throws", () => {
  const memory = new Uint8Array(65536);
  initFS(memory);
  const fs = new FSHelper(memory);

  fs.createFile("test.txt", "Original", PERM_READ);
  
  assertThrows(
    () => fs.writeFile("test.txt", "New content"),
    Error,
    "Permission denied"
  );
  
  const content = fs.readFile("test.txt");
  assertEquals(content, "Original");
});
