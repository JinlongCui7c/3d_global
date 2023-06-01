class Demo {    
    constructor() {        
        this.name = 'demo'        
        console.log(this.name)    
    }    

    getName() {        
        console.log('1111111', this.name)
    }};

Demo.prototype.getName = () => {   
     console.log('222222', this.name)
    };

const demo = new Demo();
demo.getName();


// 首先，创建了一个名为 Demo 的类，并在构造函数中打印了 this.name 的值，输出为 demo。
// 接着，通过原型为 Demo 类添加了一个箭头函数的 getName 方法。箭头函数没有自己的 this，它继承自上层作用域，而上层作用域是全局作用域。因此，箭头函数中的 this.name 为 undefined。当调用 demo.getName() 时，会输出 222222 undefined。
// 最后，虽然在类的构造函数中也定义了一个 getName 方法，但在原型中的箭头函数会覆盖它，所以实际上不会执行构造函数中的 getName 方法。
// 对于箭头函数的特性，它不适合用于作为原型方法，因为箭头函数无法访问实例的属性和方法，仅适用于在类中定义静态方法或作为辅助函数使用。





 
