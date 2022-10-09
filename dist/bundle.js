const Spec = [
    [
        /^\s+/,
        null
    ],
    [
        /^\/\/.*/,
        null
    ],
    [
        /^\/\*[\s\S]*?\*\//,
        null
    ],
    [
        /^;/,
        ';'
    ],
    [
        /^\{/,
        '{'
    ],
    [
        /^\}/,
        '}'
    ],
    [
        /^\(/,
        '('
    ],
    [
        /^\)/,
        ')'
    ],
    [
        /^,/,
        ','
    ],
    [
        /^\./,
        '.'
    ],
    [
        /^\[/,
        '['
    ],
    [
        /^\]/,
        ']'
    ],
    [
        /^\blet\b/,
        'let'
    ],
    [
        /^\bif\b/,
        "if"
    ],
    [
        /^\belse\b/,
        'else'
    ],
    [
        /^\btrue\b/,
        'true'
    ],
    [
        /^\bfalse\b/,
        'false'
    ],
    [
        /^\bnull\b/,
        'null'
    ],
    [
        /^\bwhile\b/,
        'while'
    ],
    [
        /^\bdo\b/,
        'do'
    ],
    [
        /^\bfor\b/,
        'for'
    ],
    [
        /^\bdef\b/,
        'def'
    ],
    [
        /^\breturn\b/,
        'return'
    ],
    [
        /^\bclass\b/,
        'class'
    ],
    [
        /^\bextends\b/,
        'extends'
    ],
    [
        /^\bsuper\b/,
        'super'
    ],
    [
        /^\bthis\b/,
        'this'
    ],
    [
        /^\bnew\b/,
        'new'
    ],
    [
        /^\d+/,
        'NUMBER'
    ],
    [
        /^\w+/,
        'IDENTIFIER'
    ],
    [
        /^[=!]=/,
        'EQUALITY_OPERATOR'
    ],
    [
        /^=/,
        'SIMPLE_ASSIGNMENT'
    ],
    [
        /^[\*\/\+\-]=/,
        'COMPLEX_ASSIGNMENT'
    ],
    [
        /^[+\-]/,
        'ADDITIVE_OPERATOR'
    ],
    [
        /^[\*\/]/,
        'MULTIPLICATIVE_OPERATOR'
    ],
    [
        /^[><]=?/,
        'RELATIONAL_OPERATOR'
    ],
    [
        /^&&/,
        'LOGICAL_AND'
    ],
    [
        /^\|\|/,
        'LOGICAL_OR'
    ],
    [
        /^!/,
        'LOGICAL_NOT'
    ],
    [
        /^"[^"]*"/,
        'STRING'
    ],
    [
        /^'[^']*'/,
        'STRING'
    ], 
];
class Tokenizer {
    _str;
    _cursor;
    constructor(){
        this._str = '';
        this._cursor = 0;
    }
    init(str) {
        this._str = str;
        this._cursor = 0;
    }
    getNextToken() {
        if (!this.hasMoreTokens()) return null;
        const buffer = this._str.slice(this._cursor);
        for (const [regexp, token_type] of Spec){
            const token_value = this._match(regexp, buffer);
            if (token_value == null) continue;
            if (token_type == null) return this.getNextToken();
            return {
                type: token_type,
                value: token_value
            };
        }
        throw new SyntaxError(`Unexpected token: "${buffer[0]}"`);
    }
    _match(regexp, str) {
        const matched = regexp.exec(str);
        if (matched == null) return null;
        this._cursor += matched[0].length;
        return matched[0];
    }
    hasMoreTokens() {
        return this._cursor < this._str.length;
    }
    isEOF() {
        return this._cursor === this._str.length;
    }
}
class Parser {
    _str;
    _tokenizer;
    _lookahead;
    constructor(){
        this._str = '';
        this._lookahead = null;
        this._tokenizer = new Tokenizer();
    }
    parse(program) {
        this._str = program;
        this._tokenizer.init(program);
        this._lookahead = this._tokenizer.getNextToken();
        return this.Program();
    }
    Program() {
        return {
            type: 'Program',
            body: this.StatementList()
        };
    }
    StatementList(stop_lookahead = null) {
        const statementList = [
            this.Statement()
        ];
        while(this._lookahead != null && this._lookahead.type !== stop_lookahead){
            statementList.push(this.Statement());
        }
        return statementList;
    }
    Statement() {
        switch(this._lookahead?.type){
            case ';':
                return this.EmptyStatement();
            case 'if':
                return this.IfStatement();
            case '{':
                return this.BlockStatement();
            case 'let':
                return this.VariableStatement();
            case 'def':
                return this.FunctionDeclaration();
            case 'class':
                return this.ClassDeclaration();
            case 'return':
                return this.ReturnStatement();
            case 'while':
            case 'do':
            case 'for':
                return this.IterationStatement();
            default:
                return this.ExpressionStatement();
        }
    }
    ClassDeclaration() {
        this._eat('class');
        const id = this.Identifier();
        const superClass = this._lookahead?.type === 'extends' ? this.ClassExtends() : null;
        const body = this.BlockStatement();
        return {
            type: 'ClassDeclaration',
            id,
            superClass,
            body
        };
    }
    ClassExtends() {
        this._eat('extends');
        return this.Identifier();
    }
    FunctionDeclaration() {
        this._eat('def');
        const name = this.Identifier();
        this._eat('(');
        const params = this._lookahead?.type !== ')' ? this.FormalParameterList() : [];
        this._eat(')');
        const body = this.BlockStatement();
        return {
            type: 'FunctionDeclaration',
            name,
            params,
            body
        };
    }
    FormalParameterList() {
        const params = [];
        do {
            params.push(this.Identifier());
        }while (this._lookahead?.type === ',' && this._eat(','))
        return params;
    }
    ReturnStatement() {
        this._eat('return');
        const argument = this._lookahead?.type !== ';' ? this.Expression() : null;
        this._eat(';');
        return {
            type: 'ReturnStatement',
            argument
        };
    }
    IfStatement() {
        this._eat('if');
        this._eat('(');
        const test = this.Expression();
        this._eat(')');
        const consequent = this.Statement();
        const alternate = this._lookahead != null && this._lookahead.type === 'else' ? this._eat('else') && this.Statement() : null;
        return {
            type: 'IfStatement',
            test,
            consequent,
            alternate
        };
    }
    IterationStatement() {
        switch(this._lookahead?.type){
            case 'while':
                return this.WhileStatement();
            case 'do':
                return this.DoWhileStatement();
            case 'for':
                return this.ForStatement();
            default:
                return this.WhileStatement();
        }
    }
    WhileStatement() {
        this._eat('while');
        this._eat('(');
        const test = this.Expression();
        this._eat(')');
        const body = this.Statement();
        return {
            type: 'WhileStatement',
            test,
            body
        };
    }
    DoWhileStatement() {
        this._eat('do');
        const body = this.Statement();
        this._eat('while');
        this._eat('(');
        const test = this.Expression();
        this._eat(')');
        this._eat(';');
        return {
            type: 'DoWhileStatement',
            body,
            test
        };
    }
    ForStatement() {
        this._eat('for');
        this._eat('(');
        const init = this._lookahead?.type !== ';' ? this.ForStatementInit() : null;
        this._eat(';');
        const test = this._lookahead?.type !== ';' ? this.Expression() : null;
        this._eat(';');
        const update = this._lookahead?.type !== ')' ? this.Expression() : null;
        this._eat(')');
        const body = this.Statement();
        return {
            type: 'ForStatement',
            init,
            test,
            update,
            body
        };
    }
    ForStatementInit() {
        if (this._lookahead?.type === 'let') {
            return this.VariableStatement(false);
        }
        return this.Expression();
    }
    BlockStatement() {
        this._eat('{');
        const body = this._lookahead?.type !== '}' ? this.StatementList('}') : [];
        this._eat('}');
        return {
            type: "BlockStatement",
            body
        };
    }
    ExpressionStatement() {
        const expression = this.Expression();
        this._eat(';');
        return {
            type: 'ExpressionStatement',
            expression
        };
    }
    VariableStatement(eat_semicolon = true) {
        this._eat('let');
        const declarations = this.VariableDeclarationList();
        if (eat_semicolon) this._eat(';');
        return {
            type: 'VariableStatement',
            declarations
        };
    }
    VariableDeclarationList() {
        const declarations = [];
        do {
            declarations.push(this.VariableDeclaration());
        }while (this._lookahead?.type === ',' && this._eat(','))
        return declarations;
    }
    VariableDeclaration() {
        const id = this.Identifier();
        const init = this._lookahead?.type !== ';' && this._lookahead?.type !== ',' ? this.VariableInitializer() : null;
        return {
            type: 'VariableDeclaration',
            id,
            init
        };
    }
    VariableInitializer() {
        this._eat('SIMPLE_ASSIGNMENT');
        return this.AssignmentExpression();
    }
    EmptyStatement() {
        this._eat(';');
        return {
            type: 'EmptyStatement'
        };
    }
    Expression() {
        return this.AssignmentExpression();
    }
    AssignmentExpression() {
        const left = this.LogicalORExpression();
        if (!this._isAssignmentOperator(this._lookahead.type)) {
            return left;
        } else {
            return {
                type: 'AssignmentExpression',
                operator: this.AssignmentOperator(),
                left: this._checkValidAssignmentTarget(left),
                right: this.AssignmentExpression()
            };
        }
    }
    AssignmentOperator() {
        if (this._lookahead?.type === 'SIMPLE_ASSIGNMENT') {
            return this._eat('SIMPLE_ASSIGNMENT')?.value;
        } else {
            return this._eat('COMPLEX_ASSIGNMENT')?.value;
        }
    }
    LogicalORExpression() {
        return this._LogicalExpression('LogicalANDExpression', 'LOGICAL_OR');
    }
    LogicalANDExpression() {
        return this._LogicalExpression('EqualityExpression', 'LOGICAL_AND');
    }
    LeftHandSideExpression() {
        return this.CallMemberExpression();
    }
    CallMemberExpression() {
        if (this._lookahead?.type === 'super') {
            return this._CallExpression(this.Super());
        }
        const member = this.MemberExpression();
        if (this._lookahead?.type === '(') {
            return this._CallExpression(member);
        }
        return member;
    }
    MemberExpression() {
        let object = this.PrimaryExpression();
        while(this._lookahead?.type === '.' || this._lookahead?.type === '['){
            if (this._lookahead.type == '.') {
                this._eat('.');
                const property = this.Identifier();
                object = {
                    type: 'MemberExpression',
                    computed: false,
                    object,
                    property
                };
            }
            if (this._lookahead.type === '[') {
                this._eat('[');
                const property1 = this.Expression();
                this._eat(']');
                object = {
                    type: 'MemberExpression',
                    computed: true,
                    object,
                    property: property1
                };
            }
        }
        return object;
    }
    Identifier() {
        const name = this._eat('IDENTIFIER')?.value;
        return {
            type: 'Identifier',
            name
        };
    }
    EqualityExpression() {
        return this._BinaryExpression('RelationalExpression', 'EQUALITY_OPERATOR');
    }
    RelationalExpression() {
        return this._BinaryExpression('AdditiveExpression', 'RELATIONAL_OPERATOR');
    }
    AdditiveExpression() {
        return this._BinaryExpression('MultiplicativeExpression', 'ADDITIVE_OPERATOR');
    }
    MultiplicativeExpression() {
        return this._BinaryExpression('UnaryExpression', 'MULTIPLICATIVE_OPERATOR');
    }
    _BinaryExpression(builder_name, operator_token) {
        let left = this[builder_name]();
        while(this._lookahead?.type === operator_token){
            const operator = this._eat(operator_token)?.value;
            const right = this[builder_name]();
            left = {
                type: 'BinaryExpression',
                operator,
                left,
                right
            };
        }
        return left;
    }
    _LogicalExpression(builder_name, operator_token) {
        let left = this[builder_name]();
        while(this._lookahead?.type === operator_token){
            const operator = this._eat(operator_token)?.value;
            const right = this[builder_name]();
            left = {
                type: 'LogicalExpression',
                operator,
                left,
                right
            };
        }
        return left;
    }
    _CallExpression(callee) {
        let callExpression = {
            type: 'CallExpression',
            callee,
            arguments: this.Arguments()
        };
        if (this._lookahead?.type === '(') {
            callExpression = this._CallExpression(callExpression);
        }
        return callExpression;
    }
    Arguments() {
        this._eat('(');
        const argument_list = this._lookahead?.type !== ')' ? this.ArgumentList() : [];
        this._eat(')');
        return argument_list;
    }
    ArgumentList() {
        const argument_list = [];
        do {
            argument_list.push(this.AssignmentExpression());
        }while (this._lookahead?.type === ',' && this._eat(','))
        return argument_list;
    }
    ParenthesizedExpression() {
        this._eat('(');
        const expression = this.Expression();
        this._eat(')');
        return expression;
    }
    UnaryExpression() {
        let operator = null;
        switch(this._lookahead?.type){
            case 'ADDITIVE_OPERATOR':
                operator = this._eat('ADDITIVE_OPERATOR')?.value;
                break;
            case 'LOGICAL_NOT':
                operator = this._eat('LOGICAL_NOT')?.value;
                break;
        }
        if (operator !== null) {
            return {
                type: 'UnaryExpression',
                operator: operator,
                argument: this.UnaryExpression()
            };
        }
        return this.LeftHandSideExpression();
    }
    NewExpression() {
        this._eat('new');
        return {
            type: 'NewExpression',
            callee: this.MemberExpression(),
            arguments: this.Arguments()
        };
    }
    ThisExpression() {
        this._eat('this');
        return {
            type: 'ThisExpression'
        };
    }
    Super() {
        this._eat('super');
        return {
            type: 'Super'
        };
    }
    PrimaryExpression() {
        if (this._isLiteral(this._lookahead.type)) {
            return this.Literal();
        }
        switch(this._lookahead?.type){
            case '(':
                return this.ParenthesizedExpression();
            case 'IDENTIFIER':
                return this.Identifier();
            case 'this':
                return this.ThisExpression();
            case 'new':
                return this.NewExpression();
            default:
                return this.LeftHandSideExpression();
        }
    }
    Literal() {
        switch(this._lookahead?.type){
            case 'NUMBER':
                return this.NumericLiteral();
            case 'STRING':
                return this.StringLiteral();
            case 'true':
                return this.BooleanLiteral(true);
            case 'false':
                return this.BooleanLiteral(false);
            case 'null':
                return this.NullLiteral();
            default:
                throw new SyntaxError(`Literal: enexpected literal type`);
        }
    }
    StringLiteral() {
        const token = this._eat('STRING');
        const val = token?.value;
        return {
            type: 'StringLiteral',
            value: val.slice(1, -1)
        };
    }
    NumericLiteral() {
        const token = this._eat('NUMBER');
        return {
            type: 'NumericLiteral',
            value: Number(token.value)
        };
    }
    BooleanLiteral(bool_type) {
        this._eat(bool_type ? 'true' : 'false');
        return {
            type: 'BooleanLiteral',
            value: bool_type
        };
    }
    NullLiteral() {
        this._eat('null');
        return {
            type: 'NullLiteral',
            value: null
        };
    }
    _eat(token_type) {
        const token = this._lookahead;
        if (token == null) {
            throw new SyntaxError(`Unexpected end of input, expected: "${token_type}"`);
        }
        if (token.type !== token_type) {
            throw new SyntaxError(`Unexpected token: "${token.type}", expected: "${token_type}"`);
        }
        this._lookahead = this._tokenizer.getNextToken();
        return token;
    }
    _isLiteral(token_type) {
        return token_type === 'NUMBER' || token_type === 'STRING' || token_type === 'true' || token_type === 'false' || token_type === 'null';
    }
    _checkValidAssignmentTarget(node) {
        if (node.type === 'Identifier' || node.type === 'MemberExpression') {
            return node;
        }
        throw new SyntaxError(`Invalid left-hand side in assignment expression`);
    }
    _isAssignmentOperator(token_type) {
        return token_type === 'SIMPLE_ASSIGNMENT' || token_type === 'COMPLEX_ASSIGNMENT';
    }
}
export { Parser as default };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vaG9tZS9sb2NrZS9Eb2N1bWVudHMvcHJvamVjdHMvdHMtcGFyc2VyL1BhcnNlci9Ub2tlbml6ZXIudHMiLCJmaWxlOi8vL2hvbWUvbG9ja2UvRG9jdW1lbnRzL3Byb2plY3RzL3RzLXBhcnNlci9QYXJzZXIvUGFyc2VyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRva2VuIH0gZnJvbSBcIi4vTW9kZWxzLnRzXCJcbi8vIFNwZWNzIGFyZSB0cmllZCBpbiBvcmRlciwgdGh1cywgb3JkZXIgbWF0dGVyc1xuLy8gOiBOdW1iZXJzIGhhdmUgdG8gZ28gYmVmb3JlIElkZW50aWZpZXJzXG5jb25zdCBTcGVjID0gW1xuICAgIC8vIFdoaXRlc3BhY2VzOlxuICAgIFsvXlxccysvLCBudWxsXSxcblxuICAgIC8vIENvbW1lbnRzOlxuICAgIFsvXlxcL1xcLy4qLywgbnVsbF0sXG4gICAgWy9eXFwvXFwqW1xcc1xcU10qP1xcKlxcLy8sIG51bGxdLFxuXG4gICAgLy8gU3ltYm9scywgZGVsaW1pdGVyczpcbiAgICBbL147LywgJzsnXSxcbiAgICBbL15cXHsvLCAneyddLFxuICAgIFsvXlxcfS8sICd9J10sXG4gICAgWy9eXFwoLywgJygnXSxcbiAgICBbL15cXCkvLCAnKSddLFxuICAgIFsvXiwvLCAnLCddLFxuICAgIFsvXlxcLi8sICcuJ10sXG4gICAgWy9eXFxbLywgJ1snXSxcbiAgICBbL15cXF0vLCAnXSddLFxuXG4gICAgLy8gS2V5d29yZHNcbiAgICBbL15cXGJsZXRcXGIvLCAnbGV0J10sXG4gICAgWy9eXFxiaWZcXGIvLCBcImlmXCJdLFxuICAgIFsvXlxcYmVsc2VcXGIvLCAnZWxzZSddLFxuICAgIFsvXlxcYnRydWVcXGIvLCAndHJ1ZSddLFxuICAgIFsvXlxcYmZhbHNlXFxiLywgJ2ZhbHNlJ10sXG4gICAgWy9eXFxibnVsbFxcYi8sICdudWxsJ10sXG4gICAgWy9eXFxid2hpbGVcXGIvLCAnd2hpbGUnXSxcbiAgICBbL15cXGJkb1xcYi8sICdkbyddLFxuICAgIFsvXlxcYmZvclxcYi8sICdmb3InXSxcbiAgICBbL15cXGJkZWZcXGIvLCAnZGVmJ10sXG4gICAgWy9eXFxicmV0dXJuXFxiLywgJ3JldHVybiddLFxuICAgIFsvXlxcYmNsYXNzXFxiLywgJ2NsYXNzJ10sXG4gICAgWy9eXFxiZXh0ZW5kc1xcYi8sICdleHRlbmRzJ10sXG4gICAgWy9eXFxic3VwZXJcXGIvLCAnc3VwZXInXSxcbiAgICBbL15cXGJ0aGlzXFxiLywgJ3RoaXMnXSxcbiAgICBbL15cXGJuZXdcXGIvLCAnbmV3J10sXG5cblxuICAgIFxuICAgIC8vIE51bWJlcnM6XG4gICAgWy9eXFxkKy8sICdOVU1CRVInXSxcblxuICAgIC8vIElkZW50aWZpZXJzOlxuICAgIFsvXlxcdysvICwnSURFTlRJRklFUiddLFxuXG4gICAgLy8gRXF1YWxpdHkgb3BlcmF0b3IgfCBNdXN0IGJlIGFib3ZlIHNpbXBsZSBhc3NpZ25tZW50IHxcbiAgICBbL15bPSFdPS8sICdFUVVBTElUWV9PUEVSQVRPUiddLFxuXG4gICAgLy8gQXNzaWdubWVudFxuICAgIFsvXj0vLCAnU0lNUExFX0FTU0lHTk1FTlQnXSxcbiAgICBbL15bXFwqXFwvXFwrXFwtXT0vLCAnQ09NUExFWF9BU1NJR05NRU5UJ10sXG5cbiAgICAvLyBNYXRoIG9wZXJhdG9yczpcbiAgICBbL15bK1xcLV0vLCAnQURESVRJVkVfT1BFUkFUT1InXSxcbiAgICBbL15bXFwqXFwvXS8sICdNVUxUSVBMSUNBVElWRV9PUEVSQVRPUiddLFxuICAgIFsvXls+PF09Py8sICdSRUxBVElPTkFMX09QRVJBVE9SJ10sXG4gICAgXG4gICAgLy8gTG9naWNhbCBvcGVyYXRvcnM6XG4gICAgWy9eJiYvLCAnTE9HSUNBTF9BTkQnXSxcbiAgICBbL15cXHxcXHwvLCAnTE9HSUNBTF9PUiddLFxuICAgIFsvXiEvLCAnTE9HSUNBTF9OT1QnXSxcblxuICAgIC8vIFN0cmluZ3M6XG4gICAgWy9eXCJbXlwiXSpcIi8sICdTVFJJTkcnXSxcbiAgICBbL14nW14nXSonLywgJ1NUUklORyddLFxuXG5dXG5cbi8qKlxuICogTGF6aWx5IHB1bGxzIGEgdG9rZW4gZnJvbSBhIHN0cmVhbVxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUb2tlbml6ZXIge1xuICAgIF9zdHI6IHN0cmluZ1xuICAgIF9jdXJzb3I6IG51bWJlclxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX3N0ciA9ICcnXG4gICAgICAgIHRoaXMuX2N1cnNvciA9IDBcbiAgICB9XG5cblxuICAgIGluaXQoc3RyOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fc3RyID0gc3RyXG4gICAgICAgIHRoaXMuX2N1cnNvciA9IDBcbiAgICB9XG5cbiAgICBnZXROZXh0VG9rZW4oKTogVG9rZW4gfCBudWxsIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhc01vcmVUb2tlbnMoKSkgcmV0dXJuIG51bGxcblxuICAgICAgICAvLyBSZW1haW5pbmcgcHJvZ3JhbSB0byBiZSBhbmFseXplZFxuICAgICAgICBjb25zdCBidWZmZXIgPSB0aGlzLl9zdHIuc2xpY2UodGhpcy5fY3Vyc29yKVxuXG4gICAgICAgIGZvciAoY29uc3QgW3JlZ2V4cCwgdG9rZW5fdHlwZV0gb2YgU3BlYykge1xuICAgICAgICAgICAgY29uc3QgdG9rZW5fdmFsdWUgPSB0aGlzLl9tYXRjaChyZWdleHAgYXMgUmVnRXhwLCBidWZmZXIpXG5cbiAgICAgICAgICAgIGlmICh0b2tlbl92YWx1ZSA9PSBudWxsKSBjb250aW51ZVxuXG4gICAgICAgICAgICBpZiAodG9rZW5fdHlwZSA9PSBudWxsKSByZXR1cm4gdGhpcy5nZXROZXh0VG9rZW4oKVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IHRva2VuX3R5cGUgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB0b2tlbl92YWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKGBVbmV4cGVjdGVkIHRva2VuOiBcIiR7YnVmZmVyWzBdfVwiYClcbiAgICB9XG5cbiAgICBfbWF0Y2gocmVnZXhwOiBSZWdFeHAsIHN0cjogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZWQgPSByZWdleHAuZXhlYyhzdHIpXG5cbiAgICAgICAgaWYgKG1hdGNoZWQgPT0gbnVsbCkgcmV0dXJuIG51bGxcblxuICAgICAgICB0aGlzLl9jdXJzb3IgKz0gbWF0Y2hlZFswXS5sZW5ndGhcbiAgICAgICAgcmV0dXJuIG1hdGNoZWRbMF1cbiAgICB9XG5cbiAgICBoYXNNb3JlVG9rZW5zKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY3Vyc29yIDwgdGhpcy5fc3RyLmxlbmd0aFxuICAgIH1cblxuICAgIGlzRU9GKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY3Vyc29yID09PSB0aGlzLl9zdHIubGVuZ3RoXG4gICAgfVxufSIsImltcG9ydCBUb2tlbml6ZXIgZnJvbSBcIi4vVG9rZW5pemVyLnRzXCJcblxuaW1wb3J0IHsgVG9rZW4sIEV4cHJlc3Npb24sIEV4cHJlc3Npb25TdGF0ZW1lbnQsIEJsb2NrU3RhdGVtZW50LCBQcm9ncmFtLCBFbXB0eVN0YXRlbWVudCwgVmFyaWFibGVEZWNsYXJhdGlvbiwgSWRlbnRpZmllciwgVmFyaWFibGVTdGF0ZW1lbnQsIFN0YXRlbWVudCwgSWZTdGF0ZW1lbnQsIExpdGVyYWwsIFN0cmluZ0xpdGVyYWwsIE51bWVyaWNMaXRlcmFsLCBCb29sZWFuTGl0ZXJhbCwgTnVsbExpdGVyYWwsIFVuYXJ5RXhwcmVzc2lvbiwgSXRlcmF0aW9uU3RhdGVtZW50LCBGb3JTdGF0ZW1lbnQsIEZ1bmN0aW9uRGVjbGFyYXRpb24sIFJldHVyblN0YXRlbWVudCwgTWVtYmVyRXhwcmVzc2lvbiwgTmV3RXhwcmVzc2lvbiwgVGhpc0V4cHJlc3Npb24sIFN1cGVyRXhwcmVzc2lvbiwgQ2xhc3NEZWNsYXJhdGlvbiB9IGZyb20gXCIuL01vZGVscy50c1wiXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhcnNlciB7XG4gICAgX3N0cjogc3RyaW5nXG4gICAgX3Rva2VuaXplcjogVG9rZW5pemVyXG4gICAgX2xvb2thaGVhZDogVG9rZW4gfCBudWxsXG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fc3RyID0gJydcbiAgICAgICAgdGhpcy5fbG9va2FoZWFkID0gbnVsbFxuICAgICAgICB0aGlzLl90b2tlbml6ZXIgPSBuZXcgVG9rZW5pemVyKClcbiAgICB9XG5cblxuICAgIHBhcnNlKHByb2dyYW06IHN0cmluZykge1xuICAgICAgICB0aGlzLl9zdHIgPSBwcm9ncmFtXG4gICAgICAgIHRoaXMuX3Rva2VuaXplci5pbml0KHByb2dyYW0pXG5cbiAgICAgICAgLy8gVXNlIFRva2VuaXplciB0byBvYnRhaW4gZmlyc3QgdG9rZW5cbiAgICAgICAgLy8gbG9va2FoZWFkIGlzIHVzZWQgZm9yIHByZWRpY3RpdmUgcGFyc2luZ1xuICAgICAgICB0aGlzLl9sb29rYWhlYWQgPSB0aGlzLl90b2tlbml6ZXIuZ2V0TmV4dFRva2VuKClcblxuICAgICAgICByZXR1cm4gdGhpcy5Qcm9ncmFtKClcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBtYWluIHByb2dyYW0gYW5kIGl0cyBib2R5XG4gICAgICogQ2FsbHMgY2FzY2FkZSB0byBjcmVhdGUgdHJlZTpcbiAgICAgKiBQcm9ncmFtIGhhcyBTdGF0ZW1lbnRMaXN0LCBTdGF0ZW1lbnRMaXN0IGhhcyBzdGF0ZW1lbnRzLCBzdGF0ZW1lbnRzIGhhdmUgbGl0ZXJhbHMuLi5cbiAgICAgKiBAcmV0dXJucyB7IHR5cGU6IFByb2dyYW0sIGJvZHk6IHt9fVxuICAgICAqL1xuICAgIFByb2dyYW0oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnUHJvZ3JhbScsXG4gICAgICAgICAgICBib2R5OiB0aGlzLlN0YXRlbWVudExpc3QoKSAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBTdGF0ZW1lbnRMaXN0KHN0b3BfbG9va2FoZWFkOiBzdHJpbmcgfCBudWxsID0gbnVsbCkge1xuICAgICAgICAvLyBTdGF0ZW1lbnRMaXN0IGNhbiBiZSBhIHNpbmdsZSBzdGF0ZW1lbnRcbiAgICAgICAgY29uc3Qgc3RhdGVtZW50TGlzdCA9IFt0aGlzLlN0YXRlbWVudCgpXVxuICAgICAgICAvLyBPciBhIGxpc3Qgb2Ygc3RhdGVtZW50c1xuICAgICAgICB3aGlsZSAodGhpcy5fbG9va2FoZWFkICE9IG51bGwgJiYgdGhpcy5fbG9va2FoZWFkLnR5cGUgIT09IHN0b3BfbG9va2FoZWFkKSB7XG4gICAgICAgICAgICBzdGF0ZW1lbnRMaXN0LnB1c2godGhpcy5TdGF0ZW1lbnQoKSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdGF0ZW1lbnRMaXN0XG4gICAgfVxuXG4gICAgU3RhdGVtZW50KCk6IFN0YXRlbWVudCB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5fbG9va2FoZWFkPy50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICc7JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5FbXB0eVN0YXRlbWVudCgpXG4gICAgICAgICAgICBjYXNlICdpZic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuSWZTdGF0ZW1lbnQoKVxuICAgICAgICAgICAgY2FzZSAneyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuQmxvY2tTdGF0ZW1lbnQoKVxuICAgICAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5WYXJpYWJsZVN0YXRlbWVudCgpXG4gICAgICAgICAgICBjYXNlICdkZWYnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLkZ1bmN0aW9uRGVjbGFyYXRpb24oKVxuICAgICAgICAgICAgY2FzZSAnY2xhc3MnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLkNsYXNzRGVjbGFyYXRpb24oKVxuICAgICAgICAgICAgY2FzZSAncmV0dXJuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5SZXR1cm5TdGF0ZW1lbnQoKVxuICAgICAgICAgICAgY2FzZSAnd2hpbGUnOlxuICAgICAgICAgICAgY2FzZSAnZG8nOlxuICAgICAgICAgICAgY2FzZSAnZm9yJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5JdGVyYXRpb25TdGF0ZW1lbnQoKVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5FeHByZXNzaW9uU3RhdGVtZW50KClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIENsYXNzRGVjbGFyYXRpb24oKTogQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgICAgIHRoaXMuX2VhdCgnY2xhc3MnKVxuICAgICAgICBjb25zdCBpZCA9IHRoaXMuSWRlbnRpZmllcigpXG4gICAgICAgIGNvbnN0IHN1cGVyQ2xhc3MgPSB0aGlzLl9sb29rYWhlYWQ/LnR5cGUgPT09ICdleHRlbmRzJyA/IHRoaXMuQ2xhc3NFeHRlbmRzKCkgOiBudWxsXG4gICAgICAgIGNvbnN0IGJvZHkgPSB0aGlzLkJsb2NrU3RhdGVtZW50KClcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ0NsYXNzRGVjbGFyYXRpb24nLFxuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBzdXBlckNsYXNzLFxuICAgICAgICAgICAgYm9keVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgQ2xhc3NFeHRlbmRzKCkge1xuICAgICAgICB0aGlzLl9lYXQoJ2V4dGVuZHMnKVxuICAgICAgICByZXR1cm4gdGhpcy5JZGVudGlmaWVyKClcbiAgICB9XG5cbiAgICBGdW5jdGlvbkRlY2xhcmF0aW9uKCk6IEZ1bmN0aW9uRGVjbGFyYXRpb24ge1xuICAgICAgICB0aGlzLl9lYXQoJ2RlZicpXG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLklkZW50aWZpZXIoKVxuXG4gICAgICAgIHRoaXMuX2VhdCgnKCcpXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuX2xvb2thaGVhZD8udHlwZSAhPT0gJyknID8gdGhpcy5Gb3JtYWxQYXJhbWV0ZXJMaXN0KCkgOiBbXVxuICAgICAgICB0aGlzLl9lYXQoJyknKVxuXG4gICAgICAgIGNvbnN0IGJvZHkgPSB0aGlzLkJsb2NrU3RhdGVtZW50KClcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgIGJvZHlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEZvcm1hbFBhcmFtZXRlckxpc3QoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IFtdXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKHRoaXMuSWRlbnRpZmllcigpKVxuICAgICAgICB9IHdoaWxlICh0aGlzLl9sb29rYWhlYWQ/LnR5cGUgPT09ICcsJyAmJiB0aGlzLl9lYXQoJywnKSlcblxuICAgICAgICByZXR1cm4gcGFyYW1zXG4gICAgfVxuXG4gICAgUmV0dXJuU3RhdGVtZW50KCk6IFJldHVyblN0YXRlbWVudCB7XG4gICAgICAgIHRoaXMuX2VhdCgncmV0dXJuJylcbiAgICAgICAgY29uc3QgYXJndW1lbnQgPSB0aGlzLl9sb29rYWhlYWQ/LnR5cGUgIT09ICc7JyA/IHRoaXMuRXhwcmVzc2lvbigpIDogbnVsbFxuICAgICAgICB0aGlzLl9lYXQoJzsnKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgICAgICBhcmd1bWVudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgSWZTdGF0ZW1lbnQoKTogSWZTdGF0ZW1lbnQge1xuICAgICAgICB0aGlzLl9lYXQoJ2lmJylcbiAgICAgICAgdGhpcy5fZWF0KCcoJylcbiAgICAgICAgY29uc3QgdGVzdCA9IHRoaXMuRXhwcmVzc2lvbigpXG4gICAgICAgIHRoaXMuX2VhdCgnKScpXG5cbiAgICAgICAgY29uc3QgY29uc2VxdWVudCA9IHRoaXMuU3RhdGVtZW50KClcbiAgICAgICAgY29uc3QgYWx0ZXJuYXRlID0gdGhpcy5fbG9va2FoZWFkICE9IG51bGwgJiYgdGhpcy5fbG9va2FoZWFkLnR5cGUgPT09ICdlbHNlJyA/XG4gICAgICAgICAgICB0aGlzLl9lYXQoJ2Vsc2UnKSAmJiB0aGlzLlN0YXRlbWVudCgpXG4gICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6ICdJZlN0YXRlbWVudCcsXG4gICAgICAgICAgICB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudCxcbiAgICAgICAgICAgIGFsdGVybmF0ZSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEl0ZXJhdGlvblN0YXRlbWVudCgpOiBJdGVyYXRpb25TdGF0ZW1lbnQge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuX2xvb2thaGVhZD8udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnd2hpbGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLldoaWxlU3RhdGVtZW50KClcbiAgICAgICAgICAgIGNhc2UgJ2RvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5Eb1doaWxlU3RhdGVtZW50KClcbiAgICAgICAgICAgIGNhc2UgJ2Zvcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuRm9yU3RhdGVtZW50KClcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuV2hpbGVTdGF0ZW1lbnQoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHRoaXMuX2VhdCgnd2hpbGUnKVxuICAgICAgICB0aGlzLl9lYXQoJygnKVxuICAgICAgICBjb25zdCB0ZXN0ID0gdGhpcy5FeHByZXNzaW9uKClcbiAgICAgICAgdGhpcy5fZWF0KCcpJylcblxuICAgICAgICBjb25zdCBib2R5ID0gdGhpcy5TdGF0ZW1lbnQoKVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICAgICAgdGVzdCxcbiAgICAgICAgICAgIGJvZHlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIERvV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHRoaXMuX2VhdCgnZG8nKVxuICAgICAgICBjb25zdCBib2R5ID0gdGhpcy5TdGF0ZW1lbnQoKVxuICAgICAgICBcbiAgICAgICAgdGhpcy5fZWF0KCd3aGlsZScpXG4gICAgICAgIHRoaXMuX2VhdCgnKCcpXG4gICAgICAgIGNvbnN0IHRlc3QgPSB0aGlzLkV4cHJlc3Npb24oKVxuICAgICAgICB0aGlzLl9lYXQoJyknKVxuICAgICAgICB0aGlzLl9lYXQoJzsnKVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgdGVzdCxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEZvclN0YXRlbWVudCgpOiBGb3JTdGF0ZW1lbnQge1xuICAgICAgICB0aGlzLl9lYXQoJ2ZvcicpXG4gICAgICAgIHRoaXMuX2VhdCgnKCcpXG4gICAgICAgIFxuICAgICAgICBjb25zdCBpbml0ID0gdGhpcy5fbG9va2FoZWFkPy50eXBlICE9PSAnOycgPyB0aGlzLkZvclN0YXRlbWVudEluaXQoKSA6IG51bGxcbiAgICAgICAgdGhpcy5fZWF0KCc7JylcblxuICAgICAgICBjb25zdCB0ZXN0ID0gdGhpcy5fbG9va2FoZWFkPy50eXBlICE9PSAnOycgPyB0aGlzLkV4cHJlc3Npb24oKSA6IG51bGxcbiAgICAgICAgdGhpcy5fZWF0KCc7JylcblxuICAgICAgICBjb25zdCB1cGRhdGUgPSB0aGlzLl9sb29rYWhlYWQ/LnR5cGUgIT09ICcpJyA/IHRoaXMuRXhwcmVzc2lvbigpIDogbnVsbFxuICAgICAgICB0aGlzLl9lYXQoJyknKVxuXG4gICAgICAgIGNvbnN0IGJvZHkgPSB0aGlzLlN0YXRlbWVudCgpIGFzIEJsb2NrU3RhdGVtZW50XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICAgICAgaW5pdCxcbiAgICAgICAgICAgIHRlc3QsXG4gICAgICAgICAgICB1cGRhdGUsXG4gICAgICAgICAgICBib2R5XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBGb3JTdGF0ZW1lbnRJbml0KCkge1xuICAgICAgICBpZih0aGlzLl9sb29rYWhlYWQ/LnR5cGUgPT09ICdsZXQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5WYXJpYWJsZVN0YXRlbWVudChmYWxzZSlcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLkV4cHJlc3Npb24oKVxuICAgIH1cblxuICAgIEJsb2NrU3RhdGVtZW50KCk6IEJsb2NrU3RhdGVtZW50IHtcbiAgICAgICAgdGhpcy5fZWF0KCd7JylcbiAgICAgICAgY29uc3QgYm9keSA9IHRoaXMuX2xvb2thaGVhZD8udHlwZSAhPT0gJ30nID8gdGhpcy5TdGF0ZW1lbnRMaXN0KCd9JylcbiAgICAgICAgOiBbXTtcblxuICAgICAgICB0aGlzLl9lYXQoJ30nKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogXCJCbG9ja1N0YXRlbWVudFwiLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4cHJlc3Npb24gc3RhdGVtZW50IGlzIGp1c3QgdGhlIGV4cHJlc3Npb24gKyBzZW1pY29sb25cbiAgICBFeHByZXNzaW9uU3RhdGVtZW50KCk6IEV4cHJlc3Npb25TdGF0ZW1lbnQge1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdGhpcy5FeHByZXNzaW9uKClcbiAgICAgICAgdGhpcy5fZWF0KCc7JylcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6ICdFeHByZXNzaW9uU3RhdGVtZW50JyxcbiAgICAgICAgICAgIGV4cHJlc3Npb25cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGVhdF9zZW1pY29sb3IgaXMgbmVlZGVkIGluIGZvciBzdGF0ZW1lbnQgdmFyaWFibGUgaW5pdGlhbGl6YXRpb25zXG4gICAgVmFyaWFibGVTdGF0ZW1lbnQoZWF0X3NlbWljb2xvbiA9IHRydWUpOiBWYXJpYWJsZVN0YXRlbWVudCB7XG4gICAgICAgIHRoaXMuX2VhdCgnbGV0JylcbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb25zID0gdGhpcy5WYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpXG4gICAgICAgIGlmIChlYXRfc2VtaWNvbG9uKSB0aGlzLl9lYXQoJzsnKVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnVmFyaWFibGVTdGF0ZW1lbnQnLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpOiBWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgICAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBbXVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGRlY2xhcmF0aW9ucy5wdXNoKHRoaXMuVmFyaWFibGVEZWNsYXJhdGlvbigpKVxuICAgICAgICB9IHdoaWxlICh0aGlzLl9sb29rYWhlYWQ/LnR5cGUgPT09ICcsJyAmJiB0aGlzLl9lYXQoJywnKSlcblxuICAgICAgICByZXR1cm4gZGVjbGFyYXRpb25zXG4gICAgfVxuXG4gICAgVmFyaWFibGVEZWNsYXJhdGlvbigpOiBWYXJpYWJsZURlY2xhcmF0aW9uIHtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLklkZW50aWZpZXIoKVxuXG4gICAgICAgIGNvbnN0IGluaXQgPSB0aGlzLl9sb29rYWhlYWQ/LnR5cGUgIT09ICc7JyAmJiB0aGlzLl9sb29rYWhlYWQ/LnR5cGUgIT09ICcsJyA/XG4gICAgICAgICAgICB0aGlzLlZhcmlhYmxlSW5pdGlhbGl6ZXIoKVxuICAgICAgICAgICAgOiBudWxsO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnVmFyaWFibGVEZWNsYXJhdGlvbicsXG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGluaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFZhcmlhYmxlSW5pdGlhbGl6ZXIoKSB7XG4gICAgICAgIHRoaXMuX2VhdCgnU0lNUExFX0FTU0lHTk1FTlQnKVxuICAgICAgICByZXR1cm4gdGhpcy5Bc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgfVxuXG4gICAgRW1wdHlTdGF0ZW1lbnQoKTogRW1wdHlTdGF0ZW1lbnQge1xuICAgICAgICB0aGlzLl9lYXQoJzsnKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ0VtcHR5U3RhdGVtZW50J1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTG9naWNhbCBPUiBleHByZXNzaW9uIGhhcyB0aGUgbG93ZXN0IHByaW9yaXR5IHRoZXJlZm9yZSBpdCdzIGNhbGxlZCBoZXJlXG4gICAgLy8gRWFjaCBleHByZXNzaW9uIHByb3BhZ2VzIGRlcGVuZGluZyBvbiBwcmlvcml0eVxuICAgIC8vIEFzc2lnbm1lbnQgPCBSZWxhdGlvbmFsIDwgQWRkaXRpb24gPCBNdWx0aXBsaWNhdGlvbiA8IFBhcmVudGhlc2lzXG4gICAgRXhwcmVzc2lvbigpOiBFeHByZXNzaW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuQXNzaWdubWVudEV4cHJlc3Npb24oKVxuICAgIH1cblxuICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uKCk6IGFueSB7XG4gICAgICAgIGNvbnN0IGxlZnQgPSB0aGlzLkxvZ2ljYWxPUkV4cHJlc3Npb24oKVxuXG4gICAgICAgIGlmICghdGhpcy5faXNBc3NpZ25tZW50T3BlcmF0b3IodGhpcy5fbG9va2FoZWFkIS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGxlZnRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogdGhpcy5Bc3NpZ25tZW50T3BlcmF0b3IoKSxcbiAgICAgICAgICAgICAgICBsZWZ0OiB0aGlzLl9jaGVja1ZhbGlkQXNzaWdubWVudFRhcmdldChsZWZ0KSxcbiAgICAgICAgICAgICAgICAvLyBSZWN1cnNpdmUgcHJvcGFnYXRpb25cbiAgICAgICAgICAgICAgICByaWdodDogdGhpcy5Bc3NpZ25tZW50RXhwcmVzc2lvbigpIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgQXNzaWdubWVudE9wZXJhdG9yKCkge1xuICAgICAgICBpZiAodGhpcy5fbG9va2FoZWFkPy50eXBlID09PSAnU0lNUExFX0FTU0lHTk1FTlQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZWF0KCdTSU1QTEVfQVNTSUdOTUVOVCcpPy52YWx1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VhdCgnQ09NUExFWF9BU1NJR05NRU5UJyk/LnZhbHVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBMb2dpY2FsT1JFeHByZXNzaW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fTG9naWNhbEV4cHJlc3Npb24oJ0xvZ2ljYWxBTkRFeHByZXNzaW9uJywgJ0xPR0lDQUxfT1InKVxuICAgIH1cblxuICAgIExvZ2ljYWxBTkRFeHByZXNzaW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fTG9naWNhbEV4cHJlc3Npb24oJ0VxdWFsaXR5RXhwcmVzc2lvbicsICdMT0dJQ0FMX0FORCcpXG4gICAgfVxuXG4gICAgTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuQ2FsbE1lbWJlckV4cHJlc3Npb24oKVxuICAgIH1cblxuICAgIENhbGxNZW1iZXJFeHByZXNzaW9uKCkge1xuICAgICAgICBpZiAodGhpcy5fbG9va2FoZWFkPy50eXBlID09PSAnc3VwZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fQ2FsbEV4cHJlc3Npb24odGhpcy5TdXBlcigpKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWVtYmVyID0gdGhpcy5NZW1iZXJFeHByZXNzaW9uKClcblxuICAgICAgICAvLyBJZiBhY3R1YWxseSBjYWxsIGV4cHJlc3Npb25cbiAgICAgICAgaWYgKHRoaXMuX2xvb2thaGVhZD8udHlwZSA9PT0gKCcoJykpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9DYWxsRXhwcmVzc2lvbihtZW1iZXIpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdGhlcndpc2UgcmV0dXJuIE1lbWJlckV4cHJlc3Npb25cbiAgICAgICAgcmV0dXJuIG1lbWJlcjtcbiAgICB9XG5cbiAgICBNZW1iZXJFeHByZXNzaW9uKCkge1xuICAgICAgICBsZXQgb2JqZWN0OiBhbnkgPSB0aGlzLlByaW1hcnlFeHByZXNzaW9uKClcbiAgICAgICAgd2hpbGUgKHRoaXMuX2xvb2thaGVhZD8udHlwZSA9PT0gJy4nIHx8IHRoaXMuX2xvb2thaGVhZD8udHlwZSA9PT0gJ1snKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fbG9va2FoZWFkLnR5cGUgPT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWF0KCcuJylcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IHRoaXMuSWRlbnRpZmllcigpXG4gICAgICAgICAgICAgICAgLy8gUmVjdXJzaXZpbHkgdXBkYXRlIG9iamVjdFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdCxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgaWYgKHRoaXMuX2xvb2thaGVhZC50eXBlID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lYXQoJ1snKVxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5ID0gdGhpcy5FeHByZXNzaW9uKClcbiAgICAgICAgICAgICAgICB0aGlzLl9lYXQoJ10nKVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvYmplY3RcbiAgICB9XG5cbiAgICBJZGVudGlmaWVyKCk6IElkZW50aWZpZXIge1xuICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5fZWF0KCdJREVOVElGSUVSJyk/LnZhbHVlIGFzIHN0cmluZ1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ0lkZW50aWZpZXInLFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEVxdWFsaXR5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX0JpbmFyeUV4cHJlc3Npb24oXG4gICAgICAgICAgICAnUmVsYXRpb25hbEV4cHJlc3Npb24nLFxuICAgICAgICAgICAgJ0VRVUFMSVRZX09QRVJBVE9SJ1xuICAgICAgICApXG4gICAgfVxuXG4gICAgUmVsYXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9CaW5hcnlFeHByZXNzaW9uKFxuICAgICAgICAgICAgJ0FkZGl0aXZlRXhwcmVzc2lvbicsXG4gICAgICAgICAgICAnUkVMQVRJT05BTF9PUEVSQVRPUidcbiAgICAgICAgKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZGl0aXZlRXhwcmVzc2lvblxuICAgICAqIDogTGl0ZXJhbFxuICAgICAqL1xuICAgIEFkZGl0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX0JpbmFyeUV4cHJlc3Npb24oXG4gICAgICAgICAgICAnTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uJyxcbiAgICAgICAgICAgICdBRERJVElWRV9PUEVSQVRPUidcbiAgICAgICAgKVxuICAgIH1cblxuICAgIE11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX0JpbmFyeUV4cHJlc3Npb24oXG4gICAgICAgICAgICAnVW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgICAgICdNVUxUSVBMSUNBVElWRV9PUEVSQVRPUidcbiAgICAgICAgKVxuICAgIH1cblxuICAgIC8vIEhlbHBlciBmdW5jdGlvbiB0byBhdm9pZCByZXBldGl0aW9uIGluIGFkZGl0aW9uIGFuZCBtdWx0aXBsaWNhdGlvbiBleHByZXNzaW9uc1xuICAgIF9CaW5hcnlFeHByZXNzaW9uKGJ1aWxkZXJfbmFtZTogJ1ByaW1hcnlFeHByZXNzaW9uJyB8ICdSZWxhdGlvbmFsRXhwcmVzc2lvbicgfCAnTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uJyB8ICdBZGRpdGl2ZUV4cHJlc3Npb24nIHwgJ1VuYXJ5RXhwcmVzc2lvbicsIFxuICAgIG9wZXJhdG9yX3Rva2VuOiAnRVFVQUxJVFlfT1BFUkFUT1InIHwgJ01VTFRJUExJQ0FUSVZFX09QRVJBVE9SJyB8ICdBRERJVElWRV9PUEVSQVRPUicgfCAnUkVMQVRJT05BTF9PUEVSQVRPUicpIHtcbiAgICAgICAgbGV0IGxlZnQ6IGFueSA9IHRoaXNbYnVpbGRlcl9uYW1lXSgpXG5cbiAgICAgICAgd2hpbGUodGhpcy5fbG9va2FoZWFkPy50eXBlID09PSBvcGVyYXRvcl90b2tlbikge1xuICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSB0aGlzLl9lYXQob3BlcmF0b3JfdG9rZW4pPy52YWx1ZVxuXG4gICAgICAgICAgICBjb25zdCByaWdodCA9IHRoaXNbYnVpbGRlcl9uYW1lXSgpXG5cbiAgICAgICAgICAgIGxlZnQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ0JpbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICAgICAgcmlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsZWZ0XG4gICAgfVxuXG4gICAgX0xvZ2ljYWxFeHByZXNzaW9uKGJ1aWxkZXJfbmFtZTogJ0VxdWFsaXR5RXhwcmVzc2lvbicgfCAnTG9naWNhbEFOREV4cHJlc3Npb24nLCBcbiAgICBvcGVyYXRvcl90b2tlbjogJ0xPR0lDQUxfQU5EJyB8ICdMT0dJQ0FMX09SJykge1xuICAgICAgICBsZXQgbGVmdDogYW55ID0gdGhpc1tidWlsZGVyX25hbWVdKClcblxuICAgICAgICB3aGlsZSh0aGlzLl9sb29rYWhlYWQ/LnR5cGUgPT09IG9wZXJhdG9yX3Rva2VuKSB7XG4gICAgICAgICAgICBjb25zdCBvcGVyYXRvciA9IHRoaXMuX2VhdChvcGVyYXRvcl90b2tlbik/LnZhbHVlXG5cbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0ID0gdGhpc1tidWlsZGVyX25hbWVdKClcblxuICAgICAgICAgICAgbGVmdCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnTG9naWNhbEV4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICAgICAgcmlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsZWZ0XG4gICAgfVxuXG4gICAgX0NhbGxFeHByZXNzaW9uKGNhbGxlZTogRXhwcmVzc2lvbikge1xuICAgICAgICBsZXQgY2FsbEV4cHJlc3Npb246IGFueSA9IHtcbiAgICAgICAgICAgIHR5cGU6ICdDYWxsRXhwcmVzc2lvbicsXG4gICAgICAgICAgICBjYWxsZWUsXG4gICAgICAgICAgICBhcmd1bWVudHM6IHRoaXMuQXJndW1lbnRzKClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBuZXN0ZWQgY2hhaW4gY2FsbFxuICAgICAgICBpZiAodGhpcy5fbG9va2FoZWFkPy50eXBlID09PSAnKCcpIHtcbiAgICAgICAgICAgIGNhbGxFeHByZXNzaW9uID0gdGhpcy5fQ2FsbEV4cHJlc3Npb24oY2FsbEV4cHJlc3Npb24pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2FsbEV4cHJlc3Npb25cbiAgICB9XG5cbiAgICBBcmd1bWVudHMoKSB7XG4gICAgICAgIHRoaXMuX2VhdCgnKCcpXG4gICAgICAgIGNvbnN0IGFyZ3VtZW50X2xpc3QgPSB0aGlzLl9sb29rYWhlYWQ/LnR5cGUgIT09ICcpJyA/IHRoaXMuQXJndW1lbnRMaXN0KCkgOiBbXVxuICAgICAgICB0aGlzLl9lYXQoJyknKVxuXG4gICAgICAgIHJldHVybiBhcmd1bWVudF9saXN0XG4gICAgfVxuXG4gICAgQXJndW1lbnRMaXN0KCkge1xuICAgICAgICBjb25zdCBhcmd1bWVudF9saXN0ID0gW11cblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBhcmd1bWVudF9saXN0LnB1c2godGhpcy5Bc3NpZ25tZW50RXhwcmVzc2lvbigpKVxuICAgICAgICB9IHdoaWxlICh0aGlzLl9sb29rYWhlYWQ/LnR5cGUgPT09ICcsJyAmJiB0aGlzLl9lYXQoJywnKSlcblxuICAgICAgICByZXR1cm4gYXJndW1lbnRfbGlzdFxuICAgIH1cblxuICAgIFBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKCkge1xuICAgICAgICB0aGlzLl9lYXQoJygnKVxuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdGhpcy5FeHByZXNzaW9uKClcbiAgICAgICAgdGhpcy5fZWF0KCcpJylcbiAgICAgICAgcmV0dXJuIGV4cHJlc3Npb25cbiAgICB9XG5cbiAgICBVbmFyeUV4cHJlc3Npb24oKTogYW55IHtcbiAgICAgICAgbGV0IG9wZXJhdG9yID0gbnVsbFxuICAgICAgICBzd2l0Y2ggKHRoaXMuX2xvb2thaGVhZD8udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnQURESVRJVkVfT1BFUkFUT1InOlxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gdGhpcy5fZWF0KCdBRERJVElWRV9PUEVSQVRPUicpPy52YWx1ZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnTE9HSUNBTF9OT1QnOlxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gdGhpcy5fZWF0KCdMT0dJQ0FMX05PVCcpPy52YWx1ZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wZXJhdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBvcGVyYXRvciBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHRoaXMuVW5hcnlFeHByZXNzaW9uKCkgYXMgSWRlbnRpZmllclxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpXG4gICAgfVxuXG4gICAgTmV3RXhwcmVzc2lvbigpOiBOZXdFeHByZXNzaW9uIHtcbiAgICAgICAgdGhpcy5fZWF0KCduZXcnKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICAgICAgY2FsbGVlOiB0aGlzLk1lbWJlckV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgIGFyZ3VtZW50czogdGhpcy5Bcmd1bWVudHMoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgVGhpc0V4cHJlc3Npb24oKTogVGhpc0V4cHJlc3Npb24ge1xuICAgICAgICB0aGlzLl9lYXQoJ3RoaXMnKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ1RoaXNFeHByZXNzaW9uJ1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgU3VwZXIoKTogU3VwZXJFeHByZXNzaW9uIHtcbiAgICAgICAgdGhpcy5fZWF0KCdzdXBlcicpXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnU3VwZXInXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBQcmltYXJ5RXhwcmVzc2lvbigpOiBFeHByZXNzaW9uIHwgTGl0ZXJhbCB8IElkZW50aWZpZXIge1xuICAgICAgICBpZiAodGhpcy5faXNMaXRlcmFsKHRoaXMuX2xvb2thaGVhZCEudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkxpdGVyYWwoKVxuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCh0aGlzLl9sb29rYWhlYWQ/LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlBhcmVudGhlc2l6ZWRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIGNhc2UgJ0lERU5USUZJRVInOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLklkZW50aWZpZXIoKVxuICAgICAgICAgICAgY2FzZSAndGhpcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVGhpc0V4cHJlc3Npb24oKVxuICAgICAgICAgICAgY2FzZSAnbmV3JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5OZXdFeHByZXNzaW9uKClcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBMaXRlcmFsKCk6IExpdGVyYWwge1xuICAgICAgICBzd2l0Y2godGhpcy5fbG9va2FoZWFkPy50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdOVU1CRVInOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLk51bWVyaWNMaXRlcmFsKClcbiAgICAgICAgICAgIGNhc2UgJ1NUUklORyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuU3RyaW5nTGl0ZXJhbCgpXG4gICAgICAgICAgICBjYXNlICd0cnVlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5Cb29sZWFuTGl0ZXJhbCh0cnVlKVxuICAgICAgICAgICAgY2FzZSAnZmFsc2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLkJvb2xlYW5MaXRlcmFsKGZhbHNlKVxuICAgICAgICAgICAgY2FzZSAnbnVsbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuTnVsbExpdGVyYWwoKVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoYExpdGVyYWw6IGVuZXhwZWN0ZWQgbGl0ZXJhbCB0eXBlYClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIFN0cmluZ0xpdGVyYWwoKTogU3RyaW5nTGl0ZXJhbCB7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdGhpcy5fZWF0KCdTVFJJTkcnKVxuICAgICAgICBjb25zdCB2YWwgPSB0b2tlbj8udmFsdWUgYXMgc3RyaW5nXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiAnU3RyaW5nTGl0ZXJhbCcsXG4gICAgICAgICAgICB2YWx1ZTogdmFsLnNsaWNlKDEsIC0xKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgTnVtZXJpY0xpdGVyYWwoKTogTnVtZXJpY0xpdGVyYWwge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuX2VhdCgnTlVNQkVSJylcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6ICdOdW1lcmljTGl0ZXJhbCcsXG4gICAgICAgICAgICB2YWx1ZTogTnVtYmVyKHRva2VuIS52YWx1ZSksXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBCb29sZWFuTGl0ZXJhbChib29sX3R5cGU6IGJvb2xlYW4pOiBCb29sZWFuTGl0ZXJhbCB7XG4gICAgICAgIHRoaXMuX2VhdChib29sX3R5cGUgPyAndHJ1ZScgOiAnZmFsc2UnKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogJ0Jvb2xlYW5MaXRlcmFsJyxcbiAgICAgICAgICAgIHZhbHVlOiBib29sX3R5cGVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIE51bGxMaXRlcmFsKCk6IE51bGxMaXRlcmFsIHtcbiAgICAgICAgdGhpcy5fZWF0KCdudWxsJylcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6ICdOdWxsTGl0ZXJhbCcsXG4gICAgICAgICAgICB2YWx1ZTogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2VhdCh0b2tlbl90eXBlOiBzdHJpbmcpOiBUb2tlbiB8IG51bGwge1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuX2xvb2thaGVhZFxuXG4gICAgICAgIGlmKHRva2VuID09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgICAgICAgICBgVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQsIGV4cGVjdGVkOiBcIiR7dG9rZW5fdHlwZX1cImAsXG4gICAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICBpZih0b2tlbi50eXBlICE9PSB0b2tlbl90eXBlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXG4gICAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgdG9rZW46IFwiJHt0b2tlbi50eXBlfVwiLCBleHBlY3RlZDogXCIke3Rva2VuX3R5cGV9XCJgXG4gICAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9sb29rYWhlYWQgPSB0aGlzLl90b2tlbml6ZXIuZ2V0TmV4dFRva2VuKClcblxuICAgICAgICByZXR1cm4gdG9rZW5cbiAgICB9XG5cbiAgICBfaXNMaXRlcmFsKHRva2VuX3R5cGU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gdG9rZW5fdHlwZSA9PT0gJ05VTUJFUicgXG4gICAgICAgIHx8IHRva2VuX3R5cGUgPT09ICdTVFJJTkcnIFxuICAgICAgICB8fCB0b2tlbl90eXBlID09PSAndHJ1ZScgXG4gICAgICAgIHx8IHRva2VuX3R5cGUgPT09ICdmYWxzZSdcbiAgICAgICAgfHwgdG9rZW5fdHlwZSA9PT0gJ251bGwnXG4gICAgfVxuXG4gICAgX2NoZWNrVmFsaWRBc3NpZ25tZW50VGFyZ2V0KG5vZGU6IGFueSkge1xuICAgICAgICBpZihub2RlLnR5cGUgPT09ICdJZGVudGlmaWVyJyB8fCBub2RlLnR5cGUgPT09ICdNZW1iZXJFeHByZXNzaW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGVcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihgSW52YWxpZCBsZWZ0LWhhbmQgc2lkZSBpbiBhc3NpZ25tZW50IGV4cHJlc3Npb25gKVxuICAgIH1cblxuICAgIF9pc0Fzc2lnbm1lbnRPcGVyYXRvcih0b2tlbl90eXBlOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHRva2VuX3R5cGUgPT09ICdTSU1QTEVfQVNTSUdOTUVOVCcgfHwgdG9rZW5fdHlwZSA9PT0gJ0NPTVBMRVhfQVNTSUdOTUVOVCdcbiAgICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxJQUFJLEdBQUc7SUFFVDs7UUFBUyxJQUFJO0tB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
