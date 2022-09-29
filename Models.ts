export type Token = {
    type: string,
    value: number | string
}

export type Program = {
    type: "Program",
    body: Statement[]
}

export type Statement = IfStatement | IterationStatement | BlockStatement | ExpressionStatement 
    | FunctionDeclaration | ReturnStatement | VariableStatement | EmptyStatement

export type Literal = StringLiteral | NumericLiteral | BooleanLiteral | NullLiteral;

export type StringLiteral = {
    type: 'StringLiteral',
    value: string
}

export type NumericLiteral = {
    type: 'NumericLiteral',
    value: number
}

export type BooleanLiteral = {
    type: 'BooleanLiteral',
    value: true | false
}

export type NullLiteral = {
    type: 'NullLiteral',
    value: null
}
export type BlockStatement = {
    type: "BlockStatement",
    body: Statement[]
}

export type FunctionDeclaration = {
    type: 'FunctionDeclaration',
    name: Identifier,
    params: Identifier[],
    body: BlockStatement
}

export type IfStatement = {
    type: 'IfStatement',
    test: Expression,
    consequent: Statement,
    alternate: Statement | null
}

export type IterationStatement = {
    type: string,
    test: Expression,
    body: Statement
} | ForStatement;

export type ForStatement = {
    type: 'ForStatement',
    init: VariableStatement | Expression | null,
    test: Expression | null,
    update: Expression | null
    body: BlockStatement
}

export type ReturnStatement = {
    type: 'ReturnStatement',
    argument: Expression | null
}

export type ExpressionStatement = {
    type: "ExpressionStatement",
    expression: Expression
}

export type VariableStatement = {
    type: 'VariableStatement',
    declarations: VariableDeclaration[]
}

export type UnaryExpression = {
    type: 'UnaryExpression',
    operator: string,
    argument: Expression | Identifier
}

export type VariableDeclaration = {
    type: 'VariableDeclaration',
    id: Identifier,
    init: Expression
}

export type EmptyStatement = {
    type: "EmptyStatement",
}

export type Expression = {
    type: string,
    value: number | string
}

export type Identifier = {
    type: 'Identifier',
    name: string
}