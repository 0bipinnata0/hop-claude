import { createCLI } from './cli.js';

async function main() {
  const program = await createCLI();
  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
