import * as bdd from 'intern!bdd';
import * as assert from 'intern/chai!assert';

import {ObservableClass, obsRef} from '../../src/obs/class';

bdd.describe('Observable Class', ()=>{
    bdd.it('should emit on change of obsRef', ()=>{
        class OC extends ObservableClass {
            @obsRef
            or;
        }
        const oc = new OC();

        let wasCalled = false;
        oc.on('or', ()=>{
            wasCalled = true;
        });

        oc.or = 0;
        assert.isTrue(wasCalled);
    });

    bdd.it('should emit on change of obsRef for subclasses', ()=>{
        class One extends ObservableClass {
            @obsRef
            one;
        }

        class Two extends One {
            @obsRef
            two = 2;
        }

        class Three extends Two {
            @obsRef
            three = 3;
        }

        let three = new Three();

        let oneWasCalled = false;
        three.on('one', ()=>{
            oneWasCalled = true;
        });

        let twoWasCalled = false;
        three.on('two', ()=>{
            twoWasCalled = true;
        });

        let threeWasCalled = false;
        three.on('three', ()=>{
            threeWasCalled = true;
        });

        three.one = 1;
        assert.isTrue(oneWasCalled);

        three.two = <any>'something';
        assert.isTrue(twoWasCalled);

        three.three = 0;
        assert.isTrue(threeWasCalled);
    });

    bdd.it('should support multiple obsRefs with the same property key in the prototype chain', ()=>{
        class Parent extends ObservableClass {
            @obsRef
            or = 0;
        }

        class Child extends Parent {
            @obsRef
            or = 1
        }

        const c = new Child();
        assert.strictEqual(c.or, 1);

        let wasCalled = false;
        c.on('or', ()=>{
            wasCalled = true;
        });
        c.or = 0;
        assert.isTrue(wasCalled);
    });
});
