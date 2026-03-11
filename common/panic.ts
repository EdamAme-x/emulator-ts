export function panic(message: string = "Unknown error") {
    console.error(`[PANIC] ${message}`);
    Deno.exit(1);
}
