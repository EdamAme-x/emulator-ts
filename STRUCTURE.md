# Project Structure

```
emulator-ts/
├── asm/              Assembly compiler
│   ├── index.ts      Entry point
│   ├── lexer.ts      Tokenizer
│   └── parser.ts     Parser
├── common/           Shared utilities
│   └── panic.ts      Error handling
├── cpu/              CPU emulator
│   └── index.ts      CPU implementation
├── fs/               Filesystem
│   ├── index.ts      FS implementation
│   └── ASM_API.md    Assembly interface docs
├── tests/            Test suites
│   ├── fs_test.ts
│   ├── integration_test.ts
│   ├── lexer_test.ts
│   ├── parser_test.ts
│   └── syscall_test.ts
├── shell.ts          Interactive shell
├── README.md         Documentation
└── deno.json         Config
```

## Quick Start

```bash
deno task start
```

## Run Tests

```bash
deno task test
```
