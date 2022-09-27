import { Token } from "./Models.ts"

const Spec = [
    // Whitespaces:
    [/^\s+/, null],

    // Comments:
    [/^\/\/.*/, null],
    [/^\/\*[\s\S]*?\*\//, null],

    // Symbols, delimiters:
    [/^;/, ';'],
    [/^\{/, '{'],
    [/^\}/, '}'],
    [/^\(/, '('],
    [/^\)/, ')'],

    // Math operators:
    [/^[+\-]/, 'ADDITIVE_OPERATOR'],
    [/^[\*\/]/, 'MULTIPLICATIVE_OPERATOR'],

    // Numbers:
    [/^\d+/, 'NUMBER'],

    // Strings:
    [/^"[^"]*"/, 'STRING'],
    [/^'[^']*'/, 'STRING'],

]

/**
 * Lazily pulls a token from a stream
 */
export default class Tokenizer {
    _str: string
    _cursor: number

    constructor() {
        this._str = ''
        this._cursor = 0
    }


    init(str: string) {
        this._str = str
        this._cursor = 0
    }

    getNextToken(): Token | null {
        if (!this.hasMoreTokens()) return null

        // Remaining program to be analyzed
        const buffer = this._str.slice(this._cursor)

        for (const [regexp, token_type] of Spec) {
            const token_value = this._match(regexp as RegExp, buffer)

            if (token_value == null) continue

            if (token_type == null) return this.getNextToken()

            return {
                type: token_type as string,
                value: token_value
            }
        }

        throw new SyntaxError(`Unexpected token: "${buffer[0]}"`)
    }

    _match(regexp: RegExp, str: string) {
        const matched = regexp.exec(str)

        if (matched == null) return null

        this._cursor += matched[0].length
        return matched[0]
    }

    hasMoreTokens() {
        return this._cursor < this._str.length
    }

    isEOF() {
        return this._cursor === this._str.length
    }
}