import React from "npm:react@19.2.4";
import { render, Text, Box } from "npm:ink@6.8.0";
import type { CPUState } from "./cpu/index.ts";

interface DebuggerProps {
  states: CPUState[];
  sourceLines: string[];
  maxDisplay: number;
}

const OPCODE_NAMES: Record<number, string> = {
  0x00: "ADD",
  0x01: "SUB",
  0x02: "J",
  0x04: "BEQ",
  0x05: "BNE",
  0x13: "LUI",
  0x23: "LW",
  0x2B: "SW",
  0x50: "PUSH",
  0x51: "POP",
  0xFC: "SYSCALL",
  0xFF: "HALT",
};

const OPCODE_COLORS: Record<number, string> = {
  0x00: "green",
  0x01: "green",
  0x02: "red",
  0x04: "yellow",
  0x05: "yellow",
  0x13: "blue",
  0x23: "cyan",
  0x2B: "cyan",
  0x50: "magenta",
  0x51: "magenta",
  0xFC: "red",
  0xFF: "red",
};

function Debugger({ states, sourceLines, maxDisplay }: DebuggerProps) {
  const current = states[states.length - 1];
  const previous = states.length > 1 ? states[states.length - 2] : null;
  const displayStart = Math.max(0, states.length - maxDisplay);
  const recentStates = states.slice(displayStart);

  const opcodeName = OPCODE_NAMES[current.decoded.opcode] || "???";
  const opcodeColor = OPCODE_COLORS[current.decoded.opcode] || "white";
  const currentLine = Math.floor(current.pc / 4);

  const hasRegisterChanged = (index: number): boolean => {
    if (!previous) return false;
    return current.registers[index] !== previous.registers[index];
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingX={1}>
        <Text bold color="blue">
          ──── CPU State ────
        </Text>
        <Text>
          <Text color="green">PC</Text>=<Text color="cyan" bold backgroundColor={previous && current.pc !== previous.pc ? "white" : undefined}>0x{current.pc.toString(16).padStart(4, "0")}</Text>{" "}
          <Text color="green">SP</Text>=<Text color="cyan" bold backgroundColor={previous && current.sp !== previous.sp ? "white" : undefined}>0x{current.sp.toString(16).padStart(4, "0")}</Text>{" "}
          <Text color="green">Step</Text>=<Text color="yellow" bold>{states.length}</Text>
        </Text>
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="red" flexDirection="column" paddingX={1}>
        <Text bold color="red">
          ──── Current Instruction ────
        </Text>
        <Text>
          <Text color={opcodeColor} bold>{opcodeName.padEnd(8)}</Text>
          <Text color="gray">[</Text>
          <Text color="blue">rd</Text>=<Text color="cyan">{current.decoded.rd}</Text>{" "}
          <Text color="blue">rs</Text>=<Text color="cyan">{current.decoded.rs}</Text>{" "}
          <Text color="blue">rt</Text>=<Text color="cyan">{current.decoded.rt}</Text>{" "}
          <Text color="blue">imm</Text>=<Text color="yellow">{current.decoded.imm}</Text>
          <Text color="gray">]</Text>
        </Text>
        {currentLine < sourceLines.length && (
          <Text>
            <Text color="green">→</Text> <Text color="white">{sourceLines[currentLine]}</Text>
          </Text>
        )}
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="green" flexDirection="column" paddingX={1}>
        <Text bold color="green">
          ──── Registers ────
        </Text>
        <Box flexDirection="row" gap={2}>
          <Box flexDirection="column">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const val = current.registers[i];
              const color = val === 0 ? "gray" : "cyan";
              const changed = hasRegisterChanged(i);
              return (
                <Text key={i}>
                  <Text color="blue">r{i.toString().padStart(2, "0")}</Text>
                  <Text color="gray">:</Text>{" "}
                  <Text color={color} bold backgroundColor={changed ? "white" : undefined}>0x{val.toString(16).padStart(8, "0")}</Text>
                </Text>
              );
            })}
          </Box>
          <Box flexDirection="column">
            {[8, 9, 10, 11, 12, 13, 14, 15].map((i) => {
              const val = current.registers[i];
              const color = val === 0 ? "gray" : "cyan";
              const changed = hasRegisterChanged(i);
              return (
                <Text key={i}>
                  <Text color="blue">r{i.toString().padStart(2, "0")}</Text>
                  <Text color="gray">:</Text>{" "}
                  <Text color={color} bold backgroundColor={changed ? "white" : undefined}>0x{val.toString(16).padStart(8, "0")}</Text>
                </Text>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="yellow" flexDirection="column" paddingX={1}>
        <Text bold color="yellow">
          ──── Execution History (last {recentStates.length}) ────
        </Text>
        {recentStates.map((state, idx) => {
          const op = OPCODE_NAMES[state.decoded.opcode] || "???";
          const opColor = OPCODE_COLORS[state.decoded.opcode] || "white";
          const lineNum = Math.floor(state.pc / 4);
          const isCurrent = displayStart + idx === states.length - 1;
          return (
            <Text key={displayStart + idx}>
              <Text color="gray">{(displayStart + idx + 1).toString().padStart(4, " ")}.</Text>{" "}
              <Text color="blue">0x{state.pc.toString(16).padStart(4, "0")}</Text>
              <Text color="gray">:</Text>{" "}
              <Text color={opColor} bold={isCurrent}>{op.padEnd(8)}</Text>
              {lineNum < sourceLines.length && (
                <Text color={isCurrent ? "white" : "gray"}>
                  <Text color="gray">;</Text> {sourceLines[lineNum]}
                </Text>
              )}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}

export function renderDebugger(states: CPUState[], sourceLines: string[], maxDisplay: number) {
  render(<Debugger states={states} sourceLines={sourceLines} maxDisplay={maxDisplay} />);
}
