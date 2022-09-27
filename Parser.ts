import Tokenizer from "./Tokenizer.ts"

import { Token, Expression, ExpressionStatement, BlockStatement, Program, EmptyStatement } from "./Models.ts"

export default class Parser {
    _str: string
    _tokenizer: Tokenizer
    _lookahead: Token | null

    constructor() {
        this._str = ''
        this._lookahead = null
        this._tokenizer = new Tokenizer()
    }


    parse(program: string) {
        this._str = program
        this._tokenizer.init(program)

        // Use Tokenizer to obtain first token
        // lookahead is used for predictive parsing
        this._lookahead = this._tokenizer.getNextToken()

        return this.Program()
    }

    /**
     * Returns the main program and its body
     * Calls cascade to create tree:
     * Program has StatementList, StatementList has statements, statements have literals...
     * @returns { type: Program, body: {}}
     */
    Program() {
        return {
            type: 'Program',
            body: this.StatementList()        
        }
    }

    StatementList(stop_lookahead: string | null = null) {
        // StatementList can be a single statement
        const statementList = [this.Statement()]
        // Or a list of statements
        while (this._lookahead != null && this._lookahead.type !== stop_lookahead) {
            statementList.push(this.Statement())
        }

        return statementList
    }

    Statement(): BlockStatement | ExpressionStatement | EmptyStatement {
        switch (this._lookahead?.type) {
            case ';':
                return this.EmptyStatement()
            case '{':
                return this.BlockStatement()
            default:
                return this.ExpressionStatement()
        }
    }

    BlockStatement(): BlockStatement {
        this._eat('{')
        const body = this._lookahead?.type !== '}' ? this.StatementList('}')
        : [];

        this._eat('}')
        return {
            type: "BlockStatement",
            body,
        }
    }

    // Expression statement is just the expression + semicolon
    ExpressionStatement(): ExpressionStatement {
        const expression = this.Expression()
        this._eat(';')
        return {
            type: 'ExpressionStatement',
            expression
        }
    }

    EmptyStatement(): EmptyStatement {
        this._eat(';')
        return {
            type: 'EmptyStatement'
        }
    }

    Expression(): Expression {
        return this.AdditiveExpression()
    }

    /**
     * AdditiveExpression
     * : Literal
     */
    AdditiveExpression() {
        return this._BinaryExpression(
            'MultiplicativeExpression',
            'ADDITIVE_OPERATOR'
        )
    }

    MultiplicativeExpression() {
        return this._BinaryExpression(
            'PrimaryExpression',
            'MULTIPLICATIVE_OPERATOR'
        )
    }

    // Helper function to avoid repetition in addition and multiplication expressions
    _BinaryExpression(builder_name: 'PrimaryExpression' | 'MultiplicativeExpression', 
    operator_token: 'MULTIPLICATIVE_OPERATOR' | 'ADDITIVE_OPERATOR') {
        let left: any = this[builder_name]()

        while(this._lookahead?.type === operator_token) {
            const operator = this._eat(operator_token)?.value

            const right = this[builder_name]()

            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            }
        }

        return left
    }

    ParenthesizedExpression() {
        this._eat('(')
        const expression = this.Expression()
        this._eat(')')
        return expression
    }

    PrimaryExpression() {
        switch(this._lookahead?.type) {
            case '(':
                return this.ParenthesizedExpression()
            default:
                return this.Literal()
        }
    }

    Literal() {
        switch(this._lookahead?.type) {
            case 'NUMBER':
                return this.NumericLiteral()
            case 'STRING':
                return this.StringLiteral()
            default:
                throw new SyntaxError(`Literal: enexpected literal type`)
        }
    }

    StringLiteral() {
        const token = this._eat('STRING')
        const val = token?.value as string
        return {
            type: 'StringLiteral',
            value: val.slice(1, -1)
        }
    }

    NumericLiteral() {
        const token = this._eat('NUMBER')
        return {
            type: 'NumericLiteral',
            value: Number(token!.value),
        }
    }

    _eat(token_type: string): Token | null {
        const token = this._lookahead

        if(token == null) {
            throw new SyntaxError(
                `Unexpected end of input, expected: "${token_type}"`,
            )
        }

        if(token.type !== token_type) {
            throw new SyntaxError(
                `Unexpected token: "${token.type}", expected: "${token_type}"`
            )
        }

        this._lookahead = this._tokenizer.getNextToken()

        return token
    }
}
