// Copies node/credential icons next to the compiled files, where n8n looks for them.
const fs = require('fs');
const path = require('path');

for (const dir of ['nodes', 'credentials']) {
	const walk = (current) => {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (/\.(png|svg)$/.test(entry.name)) {
				const target = path.join('dist', full);
				fs.mkdirSync(path.dirname(target), { recursive: true });
				fs.copyFileSync(full, target);
			}
		}
	};
	walk(dir);
}
