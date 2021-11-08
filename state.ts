
 class Statement{
    variable: Var;
    constructor(variable: Var){this.variable = variable}
    accept(v: Visitor){}
}
class Simple extends Statement{
    expression: Exp;
    constructor(variable: Var, expression: Exp){super(variable); this.expression = expression}
    accept(v: Visitor){v.visitSimple(this)}
}
class Watch extends Statement{
    file: Target;
    constructor(variable: Var, file: Target){super(variable); this.file = file}
    accept(v: Visitor){v.visitWatch(this)}
}
class Conditional extends Statement{
    guard: Var;
    trueexp: Exp;
    falseexp: Exp;
    constructor(variable: Var, guard: Var, trueexp: Exp, falseexp: Exp){
        super(variable); this.guard = guard; this.trueexp=trueexp;this.falseexp=falseexp;
    }
    accept(v: Visitor){v.visitConditional(this)}
}
class Exp {
    accept(v: Visitor):void{}
}
class BinOp extends Exp{
    left: Exp
    right: Exp
    constructor(left: Exp, right: Exp){super(); this.left=left;this.right=right}
}
class Mult extends BinOp{
    constructor(left: Exp, right: Exp){super(left,right)}
    accept(v: Visitor){v.visitMult(this)}
}
class Div extends BinOp{
    constructor(left: Exp, right: Exp){super(left,right)}
    accept(v: Visitor){v.visitDiv(this)}
}
class Add extends BinOp{
    constructor(left: Exp, right: Exp){super(left,right)}
    accept(v: Visitor){v.visitAdd(this)}
}
class Sub extends BinOp{
    constructor(left: Exp, right: Exp){super(left,right)}
    accept(v: Visitor){v.visitSub(this)}
}
class Num extends Exp{
    value: number
    constructor(value: number){super(); this.value=value}
    accept(v: Visitor){v.visitNum(this)}
}
class Var extends Exp{
    name: string;
    constructor(name: string){super(); this.name=name}
    accept(v: Visitor){v.visitVar(this)}
}
class Target extends Var{
    constructor(name: string){super(name)}
    accept(v: Visitor){v.visitTarget(this)}
}
class Visitor{
    visitBinOp(e: BinOp){}
    visitDiv(e: Div){ this.visitBinOp(e)}
    visitMult(e: Mult){ this.visitBinOp(e)}
    visitAdd(e: Add){ this.visitBinOp(e)}
    visitSub(e: Sub){ this.visitBinOp(e)}
    visitNum(e: Num){}
    visitVar(e: Var){}
    visitTarget(e: Target){this.visitVar(e)}
    visitSimple(s: Simple){}
    visitConditional(s: Conditional){}
    visitWatch(s: Watch){}
}
class Evaluator extends Visitor{
    state: State;
    result: number = 0;
    left: number;
    right:number;
    constructor(state: State){super(); this.state = state}
    visitBinOp(e:BinOp){
        e.left.accept(this)
        var left = this.result
        e.right.accept(this)
        this.left = left
        this.right = this.result
    }
    visitMult(e: Mult){
        this.visitBinOp(e)
        this.result = this.left * this.result;
    }
    visitDiv(e: Div){
        this.visitBinOp(e)
        this.result = this.left / this.result;
    }
    visitAdd(e: Add){
        this.visitBinOp(e)
        this.result = this.left + this.result;
    }
    visitSub(e: Sub){
        this.visitBinOp(e)
        this.result = this.left - this.result;
    }
    visitNum(e: Num){this.result = e.value}
    visitVar(e: Var){this.result = this.state.read(e.name)}
    visitSimple(s: Simple){
        s.expression.accept(this)
        this.state.update(s.variable.name,this.result)
    }
    visitConditional(s:Conditional){
        s.guard.accept(this)
        this.result != 0 ? s.trueexp.accept(this): s.falseexp.accept(this)
        this.state.update(s.variable.name,this.result)
    }
    visitWatch(s: Watch){
        this.state.update(s.variable.name,this.state.read(s.file.name))
    }
}
class Depender extends Visitor{
    results: string[] = []
    add(name: string):void {
      if(this.results.includes(name)) return 
      this.results = this.results.concat(name)
    }
    visitBinOp(e: BinOp){ e.left.accept(this); e.right.accept(this)}
    visitVar(e: Var){this.add(e.name)}
    visitSimple(s: Simple){s.expression.accept(this)}
    visitConditional(s: Conditional){
        s.guard.accept(this)
        s.trueexp.accept(this)
        s.falseexp.accept(this)
    }
    visitWatch(s: Watch) {this.add(s.file.name)}

}
function makeExp(o: any): Exp {
    switch(o.kind){
        case "Div": return new Div(makeExp(o.left),makeExp(o.right))
        case "Mult": return new Mult(makeExp(o.left),makeExp(o.right))
        case "Add": return new Add(makeExp(o.left),makeExp(o.right))
        case "Sub": return new Sub(makeExp(o.left),makeExp(o.right))
        case "Var": return new Var(o.name)
        case "Num": return new Num(o.value)
        case "Target": return new Target(o.name)
        default: throw "Not much i can do here"
    }
}
function makeStmts(o: any){
 switch(o.kind){
     case "Simple":
         return new Simple(makeExp(o.variable) as Var, makeExp(o.expression))
    case "Conditional":
        return new Conditional(makeExp(o.variable) as Var,makeExp(o.guard) as Var,
         makeExp(o.trueexp), makeExp(o.falseexp) )
    case "Watch":
        return new Watch(makeExp(o.variable) as Var, makeExp(o.file) as Target)
        default: throw "Ran out of options"
 }
}
interface Observer{
    changed(name: string, oldv: number, newv: number): void
}
class Monitor implements Observer{
    static monitor = new Monitor()
    static get(){ return this.monitor}
    changed(n: string, _v: number, v: number) {printer.log({var:n, val: v})}
}
class Exec implements Observer{
    evaler: Evaluator
    statement: Statement
    constructor(evaler: Evaluator, statement: Statement){
        this.evaler = evaler;
        this.statement = statement;
    }
    changed(name: string, oldv: number, newv: number) {
       if(oldv !=  newv) this.statement.accept(this.evaler);
    }
    
}
class Binding {
    name: string
    value: number
    observers: Observer[] = []
    constructor(name: string){this.name = name}
    update(val: number){
        var old = this.value
        this.value = val
        for(var o of this.observers) o.changed(this.name, old,val)
    }
    observer(o: Observer){ this.observers = this.observers.concat(o)}
    }

    class State {
        store: Binding[] = []
        update(name: string, value: number) { this.get(name).update(value)}
        read(name: string) {return this.get(name).value}
        get(name:string): Binding{
         for(var b of this.store)
         if (b.name == name) return b
        var v = new Binding(name)
        this.store = this.store.concat(v)
        return v;
        }
        monitor(name: string, obs: Observer){this.get(name).observer(obs)}

    }
    export interface IPrinter{
        log(o: {var: string,val:number}):void;
        last(name:string):number

    }
    class Printer implements IPrinter {
        private lastValue: Map<string,number> = new Map<string,number>()
        log(msg: { var: string; val: number; }): void {
         this.lastValue.set(msg.var, msg.val)}
         last(name: string): number { return this.lastValue.get(name)}
      } 
    var printer: IPrinter = null;
    export function main(input: any[], commands:any[], iprinter:IPrinter){
        printer = iprinter
        var prog: Statement[]=[]
        for(var s of input)
        prog = prog.concat(makeStmts(s))

        var state = new State()
        var evaler = new Evaluator(state)
        for(var stmt of prog)
        stmt.accept(evaler)
        for (var stmt of prog)
        var dep = new Depender()
        stmt.accept(dep)
        for(var name of dep.results)
         state.monitor(name,new Exec(evaler,stmt))
    
    for(var c of commands)
    switch(c.kind){
        case "Update": state.update(c.name,c.value); break
        case "Monitor": state.monitor(c.name,Monitor.get()); break
        default: throw "Mistakes,errors,and more"
            
    }
    
}
