import Tokenizer from "./Tokenizer.ts"

import { Token, Expression, ExpressionStatement, BlockStatement, Program, EmptyStatement, VariableDeclaration, Identifier, VariableStatement, Statement, IfStatement, Literal, StringLiteral, NumericLiteral, BooleanLiteral, NullLiteral, UnaryExpression, IterationStatement, ForStatement, FunctionDeclaration, ReturnStatement, MemberExpression } from "./Models.ts"

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
            case 'def':
                return this.FunctionDeclaration()
            case 'return':
                return this.ReturnStatement()
            case 'while':
            case 'do':
            case 'for':
                return this.IterationStatement()
            default:
                return this.ExpressionStatement()
        }
    }

    FunctionDeclaration(): FunctionDeclaration {
        this._eat('def')
        const name = this.Identifier()

        this._eat('(')
        const params = this._lookahead?.type !== ')' ? this.FormalParameterList() : []
        this._eat(')')

        const body = this.BlockStatement()

        return {
            type: 'FunctionDeclaration',
            name,
            params,
            body
        }
    }

    FormalParameterList() {
        const params = []
        do {
            params.push(this.Identifier())
        } while (this._lookahead?.type === ',' && this._eat(','))

        return params
    }

    ReturnStatement(): ReturnStatement {
        this._eat('return')
        const argument = this._lookahead?.type !== ';' ? this.Expression() : null
        this._eat(';')
        return {
            type: 'ReturnStatement',
            argument
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

    IterationStatement(): IterationStatement {
        switch (this._lookahead?.type) {
            case 'while':
                return this.WhileStatement()
            case 'do':
                return this.DoWhileStatement()
            case 'for':
                return this.ForStatement()
            default:
                return this.WhileStatement()
        }
    }

    WhileStatement() {
        this._eat('while')
        this._eat('(')
        const test = this.Expression()
        this._eat(')')

        const body = this.Statement()

        return {
            type: 'WhileStatement',
            test,
            body
        }
    }

    DoWhileStatement() {
        this._eat('do')
        const body = this.Statement()
        
        this._eat('while')
        this._eat('(')
        const test = this.Expression()
        this._eat(')')
        this._eat(';')

        return {
            type: 'DoWhileStatement',
            body,
            test,
        }
    }

    ForStatement(): ForStatement {
        this._eat('for')
        this._eat('(')
        
        const init = this._lookahead?.type !== ';' ? this.ForStatementInit() : null
        this._eat(';')

        const test = this._lookahead?.type !== ';' ? this.Expression() : null
        this._eat(';')

        const update = this._lookahead?.type !== ')' ? this.Expression() : null
        this._eat(')')

        const body = this.Statement() as BlockStatement

        return {
            type: 'ForStatement',
            init,
            test,
            update,
            body
        }
    }

    ForStatementInit() {
        if(this._lookahead?.type === 'let') {
            return this.VariableStatement(false)
        }

        return this.Expression()
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

    // eat_semicolor is needed in for statement variable initializations
    VariableStatement(eat_semicolon = true): VariableStatement {
        this._eat('let')
        const declarations = this.VariableDeclarationList()
        if (eat_semicolon) this._eat(';')

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
        return this.CallMemberExpression()
    }

    CallMemberExpression() {
        const member = this.MemberExpression()

        // If actually call expression
        if (this._lookahead?.type === ('(')) {
            return this._CallExpression(member)
        }

        // Otherwise return MemberExpression
        return member;
    }

    MemberExpression() {
        let object: any = this.PrimaryExpression()
        while (this._lookahead?.type === '.' || this._lookahead?.type === '[') {
            if (this._lookahead.type == '.') {
                this._eat('.')
                const property = this.Identifier()
                // Recursivily update object
                object = {
                    type: 'MemberExpression',
                    computed: false,
                    object,
                    property
                }
            } 
            if (this._lookahead.type === '[') {
                this._eat('[')
                const property = this.Expression()
                this._eat(']')
                object = {
                    type: 'MemberExpression',
                    computed: true,
                    object,
                    property
                }
            }
        }

        return object
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
            'UnaryExpression',
            'MULTIPLICATIVE_OPERATOR'
        )
    }

    // Helper function to avoid repetition in addition and multiplication expressions
    _BinaryExpression(builder_name: 'PrimaryExpression' | 'RelationalExpression' | 'MultiplicativeExpression' | 'AdditiveExpression' | 'UnaryExpression', 
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

    _CallExpression(callee: Expression) {
        let callExpression: any = {
            type: 'CallExpression',
            callee,
            arguments: this.Arguments()
        }

        // Handle nested chain call
        if (this._lookahead?.type === '(') {
            callExpression = this._CallExpression(callExpression)
        }

        return callExpression
    }

    Arguments() {
        this._eat('(')
        const argument_list = this._lookahead?.type !== ')' ? this.ArgumentList() : []
        this._eat(')')

        return argument_list
    }

    ArgumentList() {
        const argument_list = []

        do {
            argument_list.push(this.AssignmentExpression())
        } while (this._lookahead?.type === ',' && this._eat(','))

        return argument_list
    }

    ParenthesizedExpression() {
        this._eat('(')
        const expression = this.Expression()
        this._eat(')')
        return expression
    }

    UnaryExpression(): any {
        let operator = null
        switch (this._lookahead?.type) {
            case 'ADDITIVE_OPERATOR':
                operator = this._eat('ADDITIVE_OPERATOR')?.value
                break;
            case 'LOGICAL_NOT':
                operator = this._eat('LOGICAL_NOT')?.value
                break;
        }

        if (operator !== null) {
            return {
                type: 'UnaryExpression',
                operator: operator as string,
                argument: this.UnaryExpression() as Identifier
            }
        }

        return this.LeftHandSideExpression()
    }

    PrimaryExpression(): Expression | Literal | Identifier {
        if (this._isLiteral(this._lookahead!.type)) {
            return this.Literal()
        }
        switch(this._lookahead?.type) {
            case '(':
                return this.ParenthesizedExpression()
            case 'IDENTIFIER':
                return this.Identifier()
            default:
                return this.LeftHandSideExpression()
        }
    }

    Literal(): Literal {
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

    StringLiteral(): StringLiteral {
        const token = this._eat('STRING')
        const val = token?.value as string
        return {
            type: 'StringLiteral',
            value: val.slice(1, -1)
        }
    }

    NumericLiteral(): NumericLiteral {
        const token = this._eat('NUMBER')
        return {
            type: 'NumericLiteral',
            value: Number(token!.value),
        }
    }

    BooleanLiteral(bool_type: boolean): BooleanLiteral {
        this._eat(bool_type ? 'true' : 'false')
        return {
            type: 'BooleanLiteral',
            value: bool_type
        }
    }

    NullLiteral(): NullLiteral {
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
        if(node.type === 'Identifier' || node.type === 'MemberExpression') {
            return node
        }

        throw new SyntaxError(`Invalid left-hand side in assignment expression`)
    }

    _isAssignmentOperator(token_type: string) {
        return token_type === 'SIMPLE_ASSIGNMENT' || token_type === 'COMPLEX_ASSIGNMENT'
    }
}
