// Sanity checks on the compiled node description.
const assert = require('assert');
const { Wppfy } = require('../dist/nodes/Wppfy/Wppfy.node.js');
const { WppfyApi } = require('../dist/credentials/WppfyApi.credentials.js');

const { properties } = new Wppfy().description;
new WppfyApi();

const resource = properties.find((p) => p.name === 'resource');
const resources = resource.options.map((o) => o.value);
let operations = 0;

for (const res of resources) {
	const opProp = properties.find((p) => p.name === 'operation' && p.displayOptions.show.resource[0] === res);
	assert(opProp, `missing operation list for ${res}`);
	const values = opProp.options.map((o) => o.value);
	assert.strictEqual(new Set(values).size, values.length, `duplicate operation values in ${res}`);
	assert.strictEqual(new Set(opProp.options.map((o) => o.name)).size, values.length, `duplicate operation names in ${res}`);

	for (const op of opProp.options) {
		operations++;
		assert(op.routing && op.routing.request.url, `${res}.${op.value} has no request`);
		const fields = properties.filter(
			(p) => p.displayOptions && p.displayOptions.show.operation && p.displayOptions.show.resource[0] === res && p.displayOptions.show.operation[0] === op.value,
		);
		const names = fields.map((f) => f.name);
		assert.strictEqual(new Set(names).size, names.length, `duplicate field names in ${res}.${op.value}: ${names}`);
		for (const placeholder of op.routing.request.url.matchAll(/\$parameter\["([^"]+)"\]/g)) {
			assert(names.includes(placeholder[1]), `${res}.${op.value} url uses missing field ${placeholder[1]}`);
		}
		for (const f of fields.flatMap((f) => (f.type === 'collection' ? f.options : [f]))) {
			assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.name), `invalid field name ${f.name} in ${res}.${op.value}`);
		}
	}
}

console.log(`OK: ${resources.length} resources, ${operations} operations, ${properties.length} properties`);
