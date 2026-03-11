export function panic(message: string = "Unknown error"): never {
    throw new Error(`[PANIC] ${message}`);
}
