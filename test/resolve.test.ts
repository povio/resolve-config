import { test } from "node:test";
import assert from "node:assert";
import { resolveObject } from "../src/lib/resolve";



test("literal", async () => {
    const resolved = await resolveObject("simple string");
    assert.deepStrictEqual(resolved, "simple string");
});


test("number", async () => {
    const resolved = await resolveObject(41);
    assert.deepStrictEqual(resolved, 41);
});

test("boolean", async () => {
    const resolved = await resolveObject(true);
    assert.deepStrictEqual(resolved, true);
});

test("boolean false", async () => {
    const resolved = await resolveObject(false);
    assert.deepStrictEqual(resolved, false);
});

test("null", async () => {
    const resolved = await resolveObject(null);
    assert.deepStrictEqual(resolved, null);
});

test("escaped template", async () => {
    const resolved = await resolveObject('\${}');
    assert.deepStrictEqual(resolved, '${}');
});

test("undefined", async () => {
    const resolved = await resolveObject(undefined);
    assert.deepStrictEqual(resolved, undefined);
});


test("env variable", async () => {
    process.env.TEST = "test";
    const resolved = await resolveObject("${env:TEST}");
    assert.deepStrictEqual(resolved, "test");
});


test("env variables", async () => {
    process.env.TEST = "test";
    const resolved = await resolveObject("${env:TEST}-thing");
    assert.deepStrictEqual(resolved, "test-thing");
});

test("wrong function variables", async () => {
    await resolveObject({ a: "${myfunc}-thing" }, {}, 'path-to-object').catch((e)=>{
        assert.deepStrictEqual(e.message, "Unsupported template literal 'path-to-object.a': 'myfunc'");
    });
});


test("simple object", async () => {
    process.env.TEST = "test";
    const resolved = await resolveObject({
        a: "b",
        c: "${func:stage}",
        d: "${env:TEST}",
    });

    assert.deepStrictEqual(resolved, {
        a: "b",
        c: "local",
        d: "test",
    });
});

test("single property", async () => {
    process.env.TEST = "test";

    const tree = {
        a1: {
            b2: {
                c3: {
                    d4: 'e',
                    f4: ['a', 'b', 'c'],
                }
            }
        },
        g1: 'r'
    }

    assert.deepStrictEqual(await resolveObject(tree, {}, 'a1.dd'), undefined);
    assert.deepStrictEqual(await resolveObject(tree, {}, 'g1'), 'r');
    assert.deepStrictEqual(await resolveObject(tree, {}, 'a1.b2'), tree.a1.b2);
    assert.deepStrictEqual(await resolveObject(tree, {}, 'a1.b2.c3'), tree.a1.b2.c3);
    assert.deepStrictEqual(await resolveObject(tree, {}, 'a1.b2.c3.d4'), 'e'); 
    assert.deepStrictEqual(await resolveObject(tree, {}, 'a1.b2.c3.f4'), ['a', 'b', 'c']);
});

test("aws ssm", async () => {
    process.env.TEST = "test"; 
    const resolved = await resolveObject({
        a: "${arn:aws:ssm:::parameter/local/test}",
    }, {
        aws: {
            accountId: "1234567890",
            region: "us-east-1",
        }
    });

    assert.deepStrictEqual(resolved, {
        a: 'test', 
    });
});
