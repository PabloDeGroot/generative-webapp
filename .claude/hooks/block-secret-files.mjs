#!/usr/bin/env node
// PreToolUse hook for Bash: refuse commands that reference local secret files
// (.env, .env.*, functions/.env, credential*.json). .env.example is allowed.
let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const cmd = JSON.parse(input).tool_input?.command ?? '';
  const secretFile =/\.secret\.local|\.env(\.[\w-]+)?\.local(?![\w.-])|credential[\w-]*\.json|serviceAccount[\w-]*\.json/;
  if (secretFile.test(cmd)) {
    console.error('Blocked: this command references a local secret file (.env / credential JSON). Keep secrets out of the conversation.');
    process.exit(2);
  }
});
