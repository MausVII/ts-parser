export type Token = {
    type: string,
    value: number | string
}

export type Program = {
    type: "Program",
    body: (ExpressionStatement|BlockStatement)[]
}

export type BlockStatement = {
    type: "BlockStatement",
    body: (BlockStatement|ExpressionStatement|EmptyStatement)[]
}

export type ExpressionStatement = {
    type: "ExpressionStatement",
    expression: Expression
}

export type EmptyStatement = {
    type: "EmptyStatement",
}

export type Expression = {
    type: string,
    value: number | string
}