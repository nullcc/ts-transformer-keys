import { keys } from '../index';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { compile } from './compile/compile';
import { XXX } from './interface';


describe('keys', () => {
  it('return keys of given type', () => {
    assert.deepStrictEqual(keys(), []);
    assert.deepStrictEqual(keys<any>(), []);

    interface Foo {
      foo: string;
    }
    assert.deepStrictEqual(keys<Foo>(), ['foo']);

    type FooBar = {
      foo: string;
      bar?: number;
    };
    assert.deepStrictEqual(keys<FooBar>(), ['foo', 'bar']);

    interface BarBaz {
      bar: Function;
      baz: Date;
    }
    assert.deepStrictEqual(keys<FooBar & BarBaz>(), ['foo', 'bar', 'baz']);
    assert.deepStrictEqual(keys<FooBar | BarBaz>(), ['bar']);
    assert.deepStrictEqual(keys<FooBar & any>(), []);
    assert.deepStrictEqual(keys<FooBar | any>(), []);

    interface Nested {
      foo: {
        a: Function;
        b: string;
        c: {
          d: number;
        }
      }
      bar: Date;
    }
    assert.deepStrictEqual(keys<Nested>(), [ 'foo', 'foo.a', 'foo.b', 'foo.c', 'foo.c.d', 'bar' ]);

    interface X {
      a: number;
      b: {
        c: number;
        d: Y;
      };
      e: Z
    }
    interface Y {
      y1: number;
      y2: W;
    }
    interface Z {
      z1: number;
      z2: string;
    }
    interface W {
      w1: number;
      w2: string;
      w3: Function;
      w4: Date;
    }
    assert.deepStrictEqual(keys<X>(), [
      'a',
      'b',
      'b.c',
      'b.d',
      'b.d.y1',
      'b.d.y2',
      'b.d.y2.w1',
      'b.d.y2.w2',
      "b.d.y2.w3",
      "b.d.y2.w4",
      'e',
      'e.z1',
      'e.z2' ]);

    interface A {
      a: string;
      b: B;
    }
    interface B {
      x: string;
      y: string;
    }
    interface C extends A {
      u: string;
      v: string;
    }
    assert.deepStrictEqual(keys<C>(), [ 'u', 'v', 'a', 'b', 'b.x', 'b.y' ]);

    assert.deepStrictEqual(keys<XXX>(), [ 'a', 'b', 'b.y' ]);

  });
  const fileTransformationDir = path.join(__dirname, 'fileTransformation');
  fs.readdirSync(fileTransformationDir).filter((file) => path.extname(file) === '.ts').forEach((file) =>
    it(`transforms ${file} as expected`, () => {
      let result = '';
      const fullFileName = path.join(fileTransformationDir, file), postCompileFullFileName = fullFileName.replace(/\.ts$/, '.js');
      compile([fullFileName], (fileName, data) => postCompileFullFileName === path.join(fileName) && (result = data));
      assert.strictEqual(result.replace(/\r\n/g, '\n'), fs.readFileSync(postCompileFullFileName, 'utf-8'));
    }).timeout(0)
  );
});
