// Read the `_headers` rules and answer "what would this deployment send for <path>?".
//
// It exists so the rules can be tested rather than eyeballed: the same file that ships to
// Cloudflare is the one the tests interrogate, so a rule that is edited without thinking
// fails here instead of in production.

/** Parse a Cloudflare-style `_headers` file into ordered rules. */
export function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else {
      const [name, ...rest] = line.trim().split(':');
      if (!current) throw new Error(`header \`${line.trim()}\` appears before any path pattern`);
      current.headers[name.toLowerCase()] = rest.join(':').trim();
    }
  }
  return rules;
}

function matches(pattern, path) {
  const regex = new RegExp(`^${pattern.split('*').map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);
  return regex.test(path);
}

/** The headers a path would receive: later matching rules win, as Cloudflare applies them. */
export function headersFor(rules, path) {
  const out = {};
  for (const rule of rules) {
    if (matches(rule.pattern, path)) Object.assign(out, rule.headers);
  }
  return out;
}
