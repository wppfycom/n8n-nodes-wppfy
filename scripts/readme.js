// Rewrites the operations section of README.md from the compiled node description.
const fs = require('fs');
const { properties } = require('../dist/nodes/Wppfy/operations.generated.js');

const START = '<!-- operations:start -->';
const END = '<!-- operations:end -->';

const resource = properties.find((p) => p.name === 'resource');
let total = 0;
const sections = resource.options.map(({ name, value }) => {
	const opProp = properties.find((p) => p.name === 'operation' && p.displayOptions.show.resource[0] === value);
	const rows = opProp.options.map((op) => {
		total++;
		const { method, url } = op.routing.request;
		const path = url.replace(/^=/, '').replace(/\{\{encodeURIComponent\(\$parameter\["([^"]+)"\]\)\}\}/g, '{$1}');
		return `| ${op.name} | \`${method} ${path}\` |`;
	});
	return `<details>\n<summary><b>${name}</b> (${rows.length})</summary>\n\n| Operation | Endpoint |\n| --- | --- |\n${rows.join('\n')}\n\n</details>`;
});

const block = `${START}\n${resource.options.length} resources, ${total} operations.\n\n${sections.join('\n\n')}\n${END}`;
const readme = fs.readFileSync('README.md', 'utf8');
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start === -1 || end === -1) throw new Error('README.md is missing the operations markers');
fs.writeFileSync('README.md', readme.slice(0, start) + block + readme.slice(end + END.length));
console.log(`README.md: ${total} operations listed`);
