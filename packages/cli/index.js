#!/usr/bin/env node

/**
 * SudoMeet CLI — command-line interface for meeting management.
 * npx sudomeet [command]
 */

const commands = {
  start: "Start or join a meeting",
  join: "Join a meeting by room code",
  list: "List your meetings",
  create: "Create a new meeting",
  "api-key": "Manage API keys",
  help: "Show help",
};

function showHelp() {
  console.log("\n📹  SudoMeet CLI\n");
  console.log("Usage: npx sudomeet [command] [options]\n");
  console.log("Commands:");
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  });
  console.log("\nExamples:");
  console.log("  npx sudomeet start");
  console.log("  npx sudomeet join abc123");
  console.log("  npx sudomeet create --title 'Team sync'");
  console.log(
    "\nNote: This is a minimal Phase 13 CLI. Full implementation coming soon.\n"
  );
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  switch (command) {
    case "start":
      console.log("🚀 Opening SudoMeet in your browser...");
      console.log("→  https://sudomeet-v1.vercel.app");
      break;

    case "join":
      const roomCode = args[1];
      if (!roomCode) {
        console.error("Error: Room code required");
        console.log("Usage: npx sudomeet join <room-code>");
        process.exit(1);
      }
      console.log(`🚀 Joining room ${roomCode}...`);
      console.log(`→  https://sudomeet-v1.vercel.app/m/${roomCode}`);
      break;

    case "create":
      console.log("Creating a new meeting requires an API key.");
      console.log("Generate one at: https://sudomeet-v1.vercel.app/settings/api-keys");
      break;

    case "list":
      console.log("Listing meetings requires an API key.");
      console.log("Generate one at: https://sudomeet-v1.vercel.app/settings/api-keys");
      break;

    case "api-key":
      console.log("Manage API keys at: https://sudomeet-v1.vercel.app/settings/api-keys");
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log("Run 'npx sudomeet help' for usage information.");
      process.exit(1);
  }
}

main();
