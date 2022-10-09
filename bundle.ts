import { bundle } from "https://deno.land/x/emit@0.9.0/mod.ts"

const file = await bundle('./Parser/Parser.ts', {type: "module"})

const { code } = file;

const encoder = new TextEncoder()
await Deno.writeFile('./dist/bundle.js', encoder.encode(code))