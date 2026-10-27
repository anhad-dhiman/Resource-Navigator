// Creates an admin account. There is no public sign-up; accounts are made here.
// Usage: npm run admin:create -- --username alice --role moderator
// The password is asked for interactively and never echoed, logged or passed as an argument.
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { createPool } from '../src/db/pool.js';
import { createAdminRepository } from '../src/db/adminRepository.js';
import { ADMIN_ROLES, hashPassword } from '../src/services/authService.js';

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores anything longer

// One readline for all prompts. Typed characters are hidden; lines are queued so
// input that arrives early (e.g. piped) isn't lost.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
rl._writeToOutput = (text) => {
  if (!muted) rl.output.write(text);
};
const lines = [];
const waiting = [];
rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
rl.on('close', () => waiting.splice(0).forEach((resolve) => resolve('')));

async function askHidden(question) {
  muted = false;
  rl.output.write(question);
  muted = true;
  const answer = lines.length ? lines.shift() : await new Promise((resolve) => waiting.push(resolve));
  muted = false;
  rl.output.write('\n');
  return answer;
}

function fail(message) {
  rl.close();
  console.error(`Error: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: { username: { type: 'string' }, role: { type: 'string', default: 'moderator' } },
});
const { username, role } = values;

if (!username || !USERNAME_PATTERN.test(username)) {
  fail('--username is required: 3-32 characters, letters, numbers, dot, dash or underscore.');
}
if (!ADMIN_ROLES.includes(role)) {
  fail(`--role must be one of: ${ADMIN_ROLES.join(', ')}.`);
}

const password = await askHidden(`Password for ${username}: `);
if (password.length < MIN_PASSWORD_LENGTH)
  fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES)
  fail(`Password must be at most ${MAX_PASSWORD_BYTES} bytes.`);
if ((await askHidden('Repeat password: ')) !== password) fail('Passwords do not match.');
rl.close();

const pool = createPool();
try {
  const repo = createAdminRepository(pool);
  if (await repo.findByUsername(username)) fail(`An account named "${username}" already exists.`);
  const user = await repo.create({ username, passwordHash: await hashPassword(password), role });
  console.log(`Created ${user.role} "${user.username}" (user_id ${user.user_id}).`);
} catch (err) {
  fail(err.message);
} finally {
  await pool.end();
}
