export type Token = {
    type: string,
    value: number | string
}

export type Program = {
    type: "Program",
    body: Statement[]
}

export type Statement = IfStatement | BlockStatement | ExpressionStatement | VariableStatement | EmptyStatement

export type BlockStatement = {
    type: "BlockStatement",
    body: Statement[]
}

export type IfStatement = {
    type: 'IfStatement',
    test: Expression,
    consequent: Statement,
    alternate: Statement | null
}

export type ExpressionStatement = {
    type: "ExpressionStatement",
    expression: Expression
}

export type VariableStatement = {
    type: 'VariableStatement',
    declarations: VariableDeclaration[]
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