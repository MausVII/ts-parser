import Parser from "./Parser/Parser.ts";

const parser = new Parser()

const program = 
`
    class Point {
        def constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        def calc() {
            return this.x + this.y;
        }
    }

    class Point3D extends Point {
        def constructor(x, y, z) {
            super(x, y);
            this.z = z;
        }

        def calc() {
            return super() + this.z;
        }
    }

    let p = new Point3D(10, 20, 30);

    p.calc();
`

const ast = parser.parse(program)
console.log(JSON.stringify(ast, null, 2))