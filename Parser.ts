import Tokenizer from "./Tokenizer.ts"

import { Token, Expression, ExpressionStatement, BlockStatement, Program, EmptyStatement, VariableDeclaration, Identifier, VariableStatement, Statement, IfStatement } from "./Models.ts"

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

    Statement(): Statement {
        switch (this._lookahead?.type) {
            case ';':
                return this.EmptyStatement()
            case 'if':
                return this.IfStatement()
            case '{':
                return this.BlockStatement()
            case 'let':
                return this.VariableStatement()
            default:
                return this.ExpressionStatement()
        }
    }

    IfStatement(): IfStatement {
        this._eat('if')
        this._eat('(')
        const test = this.Expression()
        this._eat(')')

        const consequent = this.Statement()
        const alternate = this._lookahead != null && this._lookahead.type === 'else' ?
            this._eat('else') && this.Statement()
            : null;

        return {
            type: 'IfStatement',
            test,
            consequent,
            alternate,
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

    VariableStatement(): VariableStatement {
        this._eat('let')
        const declarations = this.VariableDeclarationList()
        this._eat(';')

        return {
            type: 'VariableStatement',
            declarations
        }
    }

    VariableDeclarationList(): VariableDeclaration[] {
        const declarations = []

        do {
            declarations.push(this.VariableDeclaration())
        } while (this._lookahead?.type === ',' && this._eat(','))

        return declarations
    }

    VariableDeclaration(): VariableDeclaration {
        const id = this.Identifier()

        const init = this._lookahead?.type !== ';' && this._lookahead?.type !== ',' ?
            this.VariableInitializer()
            : null;

        return {
            type: 'VariableDeclaration',
            id,
            init
        }
    }

    VariableInitializer() {
        this._eat('SIMPLE_ASSIGNMENT')
        return this.AssignmentExpression()
    }

    EmptyStatement(): EmptyStatement {
        this._eat(';')
        return {
            type: 'EmptyStatement'
        }
    }

    // Logical OR expression has the lowest priority therefore it's called here
    // Each expression propages depending on priority
    // Assignment < Relational < Addition < Multiplication < Parenthesis
    Expression(): Expression {
        return this.AssignmentExpression()
    }

    AssignmentExpression(): any {
        const left = this.LogicalORExpression()

        if (!this._isAssignmentOperator(this._lookahead!.type)) {
            return left
        } else {
            return {
                type: 'AssignmentExpression',
                operator: this.AssignmentOperator(),
                left: this._checkValidAssignmentTarget(left),
                // Recursive propagation
                right: this.AssignmentExpression() 
            }
        }
    }

    AssignmentOperator() {
        if (this._lookahead?.type === 'SIMPLE_ASSIGNMENT') {
            return this._eat('SIMPLE_ASSIGNMENT')?.value
        } else {
            return this._eat('COMPLEX_ASSIGNMENT')?.value
        }
    }

    LogicalORExpression() {
        return this._LogicalExpression('LogicalANDExpression', 'LOGICAL_OR')
    }

    LogicalANDExpression() {
        return this._LogicalExpression('EqualityExpression', 'LOGICAL_AND')
    }

    LeftHandSideExpression() {
        return this.Identifier()
    }

    Identifier(): Identifier {
        const name = this._eat('IDENTIFIER')?.value as string
        return {
            type: 'Identifier',
            name,
        }
    }

    EqualityExpression() {
        return this._BinaryExpression(
            'RelationalExpression',
            'EQUALITY_OPERATOR'
        )
    }

    RelationalExpression() {
        return this._BinaryExpression(
            'AdditiveExpression',
            'RELATIONAL_OPERATOR'
        )
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
    _BinaryExpression(builder_name: 'PrimaryExpression' | 'RelationalExpression' | 'MultiplicativeExpression' | 'AdditiveExpression', 
    operator_token: 'EQUALITY_OPERATOR' | 'MULTIPLICATIVE_OPERATOR' | 'ADDITIVE_OPERATOR' | 'RELATIONAL_OPERATOR') {
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

    _LogicalExpression(builder_name: 'EqualityExpression' | 'LogicalANDExpression', 
    operator_token: 'LOGICAL_AND' | 'LOGICAL_OR') {
        let left: any = this[builder_name]()

        while(this._lookahead?.type === operator_token) {
            const operator = this._eat(operator_token)?.value

            const right = this[builder_name]()

            left = {
                type: 'LogicalExpression',
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
        if (this._isLiteral(this._lookahead!.type)) {
            return this.Literal()
        }
        switch(this._lookahead?.type) {
            case '(':
                return this.ParenthesizedExpression()
            default:
                return this.LeftHandSideExpression()
        }
    }

    Literal() {
        switch(this._lookahead?.type) {
            case 'NUMBER':
                return this.NumericLiteral()
            case 'STRING':
                return this.StringLiteral()
            case 'true':
                return this.BooleanLiteral(true)
            case 'false':
                return this.BooleanLiteral(false)
            case 'null':
                return this.NullLiteral()
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

    BooleanLiteral(bool_type: boolean) {
        this._eat(bool_type ? 'true' : 'false')
        return {
            type: 'BooleanLiteral',
            value: bool_type
        }
    }

    NullLiteral() {
        this._eat('null')
        return {
            type: 'NullLiteral',
            value: null
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

    _isLiteral(token_type: string) {
        return token_type === 'NUMBER' 
        || token_type === 'STRING' 
        || token_type === 'true' 
        || token_type === 'false'
        || token_type === 'null'
    }

    _checkValidAssignmentTarget(node: any) {
        if(node.type === 'Identifier') {
            return node
        }

        throw new SyntaxError(`Invalid left-hand side in assignment expression`)
    }

    _isAssignmentOperator(token_type: string) {
        return token_type === 'SIMPLE_ASSIGNMENT' || token_type === 'COMPLEX_ASSIGNMENT'
    }
}
