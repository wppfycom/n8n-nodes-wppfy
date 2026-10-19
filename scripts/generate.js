#!/usr/bin/env node
// Generates the n8n node properties (resources, operations and fields) from the WppFy OpenAPI file.
// Usage: node scripts/generate.js <openapi.json> <output.ts>
const fs = require('fs');

const [, , specPath, outPath] = process.argv;
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const SKIP_PATHS = new Set(['/sse']); // streaming endpoint, not usable as a request/response action
const ACRONYMS = { id: 'ID', ids: 'IDs', url: 'URL', jid: 'JID', jids: 'JIDs', api: 'API', pix: 'PIX', vcard: 'vCard', ai: 'AI', crm: 'CRM', sse: 'SSE' };

const camel = (text) => {
	const words = text.replace(/[{}]/g, '').split(/[^a-zA-Z0-9]+/).filter(Boolean);
	return words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1))).join('');
};

const humanize = (name) => {
	const words = name
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((w) => ACRONYMS[w.toLowerCase()] || w.toLowerCase());
	if (!words.length) return name;
	words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
	return words.join(' ');
};

const shortText = (text, max = 300) => {
	if (!text) return undefined;
	const firstParagraph = String(text).trim().split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ').replace(/[*`#]/g, '').trim();
	return firstParagraph.length > max ? `${firstParagraph.slice(0, max - 1).trimEnd()}…` : firstParagraph;
};

const resolve = (schema) => {
	let current = schema || {};
	const seen = new Set();
	while (current.$ref && !seen.has(current.$ref)) {
		seen.add(current.$ref);
		current = current.$ref.replace(/^#\//, '').split('/').reduce((obj, key) => obj[key], spec);
	}
	return current;
};

// Merge properties of composed schemas (allOf/oneOf/anyOf) so every possible field is offered.
const collectProperties = (schema) => {
	const resolved = resolve(schema);
	const properties = { ...(resolved.properties || {}) };
	const required = new Set(resolved.required || []);
	for (const key of ['allOf', 'oneOf', 'anyOf']) {
		for (const part of resolved[key] || []) {
			const sub = collectProperties(part);
			for (const [name, prop] of Object.entries(sub.properties)) if (!properties[name]) properties[name] = prop;
			if (key === 'allOf') sub.required.forEach((r) => required.add(r));
		}
	}
	return { properties, required: [...required].filter((r) => properties[r]) };
};

const fieldFor = (name, rawSchema, { location, required, show }) => {
	const schema = resolve(rawSchema);
	const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
	const field = {
		displayName: humanize(name),
		name,
		required: required || undefined,
		description: shortText(schema.description || rawSchema.description),
		displayOptions: show,
	};
	const send = { type: location === 'query' ? 'query' : 'body', property: name };

	if (schema.enum) {
		field.type = 'options';
		field.options = schema.enum.map((value) => ({ name: String(value), value }));
		field.default = schema.default ?? schema.enum[0];
	} else if (type === 'boolean') {
		field.type = 'boolean';
		field.default = schema.default ?? false;
	} else if (type === 'integer' || type === 'number') {
		field.type = 'number';
		field.default = schema.default ?? (typeof schema.example === 'number' ? schema.example : 0);
	} else if (type === 'array' || type === 'object' || schema.properties || schema.oneOf || schema.anyOf) {
		field.type = 'json';
		const example = schema.example ?? schema.default ?? (type === 'array' ? [] : {});
		field.default = JSON.stringify(example, null, 2);
		send.value = '={{ typeof $value === "string" ? JSON.parse($value) : $value }}';
	} else {
		field.type = 'string';
		field.default = schema.default ?? '';
		if (schema.format === 'password' || /token|apikey|api_key|secret/i.test(name)) field.typeOptions = { password: true };
		if (rawSchema.example !== undefined || schema.example !== undefined) field.placeholder = String(schema.example ?? rawSchema.example);
	}

	if (location !== 'path') field.routing = { send };
	return field;
};

const resources = new Map();
const tagOrder = (spec.tags || []).map((t) => t.name);

for (const [path, item] of Object.entries(spec.paths)) {
	if (SKIP_PATHS.has(path)) continue;
	const methods = METHODS.filter((m) => item[m]);
	for (const method of methods) {
		const op = item[method];
		const tag = (op.tags && op.tags[0]) || 'Other';
		if (!resources.has(tag)) resources.set(tag, []);
		const base = camel(path.replace(/\{([^}]+)\}/g, 'by $1'));
		const value = methods.length > 1 ? camel(`${method} ${base}`) : base;
		resources.get(tag).push({ path, method, op, value, params: [...(item.parameters || []), ...(op.parameters || [])] });
	}
}

const resourceEntries = [...resources.entries()].sort((a, b) => {
	const ia = tagOrder.indexOf(a[0]);
	const ib = tagOrder.indexOf(b[0]);
	return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
});

const properties = [];
properties.push({
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: resourceEntries.map(([tag]) => ({ name: tag, value: camel(tag) })),
	default: camel(resourceEntries[0][0]),
});

let operationCount = 0;
for (const [tag, ops] of resourceEntries) {
	const resource = camel(tag);
	const usedNames = new Set();
	const operationOptions = ops.map(({ path, method, op, value }) => {
		let name = op.summary || `${method.toUpperCase()} ${path}`;
		if (usedNames.has(name)) name = `${name} (${method.toUpperCase()})`;
		usedNames.add(name);
		const url = `=${path.replace(/\{([^}]+)\}/g, (m, p) => `{{encodeURIComponent($parameter["${p}"])}}`)}`;
		return {
			name,
			value,
			action: name,
			description: shortText(op.description, 200),
			routing: { request: { method: method.toUpperCase(), url } },
		};
	});
	operationOptions.sort((a, b) => a.name.localeCompare(b.name));
	properties.push({
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: operationOptions,
		default: operationOptions[0].value,
	});

	for (const { op, value, params } of ops) {
		operationCount++;
		const show = { show: { resource: [resource], operation: [value] } };
		const requiredFields = [];
		const optionalFields = [];
		const taken = new Set();

		for (const raw of params) {
			const param = resolve(raw);
			if (!['path', 'query'].includes(param.in) || taken.has(param.name)) continue;
			taken.add(param.name);
			const isRequired = param.in === 'path' || param.required;
			const field = fieldFor(param.name, { ...(param.schema || {}), description: param.description, example: param.example }, {
				location: param.in,
				required: isRequired,
				show: isRequired ? show : undefined,
			});
			(isRequired ? requiredFields : optionalFields).push(field);
		}

		const body = op.requestBody && op.requestBody.content && op.requestBody.content['application/json'];
		if (body && body.schema) {
			const { properties: bodyProps, required } = collectProperties(body.schema);
			for (const [name, schema] of Object.entries(bodyProps)) {
				if (taken.has(name)) continue;
				taken.add(name);
				const isRequired = required.includes(name);
				const field = fieldFor(name, schema, { location: 'body', required: isRequired, show: isRequired ? show : undefined });
				(isRequired ? requiredFields : optionalFields).push(field);
			}
		}

		properties.push(...requiredFields);
		if (optionalFields.length) {
			properties.push({
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: show,
				options: optionalFields
					.map(({ required, displayOptions, ...rest }) => rest)
					.sort((a, b) => a.displayName.localeCompare(b.displayName)),
			});
		}
	}
}

const clean = (value) => JSON.parse(JSON.stringify(value, (key, v) => (v === undefined ? undefined : v)));

const banner = `// Generated by scripts/generate.js from ${specPath.replace(/\\/g, '/')} — do not edit by hand.\n`;
const output = `${banner}import type { INodeProperties } from 'n8n-workflow';\n\nexport const properties: INodeProperties[] = ${JSON.stringify(clean(properties), null, '\t')};\n`;
fs.writeFileSync(outPath, output);
console.log(`Generated ${resourceEntries.length} resources, ${operationCount} operations -> ${outPath}`);
