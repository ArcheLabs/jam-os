import { parseCommand } from "../parser";
import { normalizePath } from "../../protocols/jamFs";
import type { CommandResult, ShellContext } from "../context";

const needFs = (ctx: ShellContext): CommandResult | null => ctx.fs ? null : { exitCode: 1, stderr: "No Computer Service configured. Open Settings to create one." };
export async function executeCommand(ctx: ShellContext, input: string): Promise<CommandResult> {
  let args: string[]; try { args = parseCommand(input); } catch (e) { return { exitCode: 2, stderr: e instanceof Error ? e.message : "Parse error" }; }
  if (!args.length) return { exitCode: 0 }; const command = args.shift()!; const fsError = ["ls", "pwd", "cd", "cat", "write", "touch", "mkdir", "rm", "mv", "site"].includes(command) ? needFs(ctx) : null; if (fsError) return fsError;
  const path = (value = ctx.cwd) => normalizePath(value.startsWith("/") ? value : value.startsWith("~") ? `/home/user${value.slice(1)}` : value, ctx.cwd);
  try {
    switch (command) {
      case "help": return { exitCode: 0, stdout: "help clear pwd ls cd cat write touch mkdir rm mv whoami status name site service playground browser doom" };
      case "clear": return { exitCode: 0, stdout: "\u0000CLEAR" };
      case "pwd": return { exitCode: 0, stdout: ctx.cwd };
      case "ls": { const nodes = await ctx.fs!.list(path(args[0])); return { exitCode: 0, stdout: nodes.map((n) => n.type === "directory" ? `${n.path.split("/").pop()}/` : n.path.split("/").pop()).join("  ") || "(empty)" }; }
      case "cd": { const target = path(args[0] || "/home/user"); const stat = await ctx.fs!.stat(target); if (stat.type !== "directory") return { exitCode: 1, stderr: `${target}: not a directory` }; return { exitCode: 0, stdout: `__CWD__${target}` }; }
      case "cat": return { exitCode: 0, stdout: await ctx.fs!.readText(path(args[0])) };
      case "write": if (args.length < 2) return { exitCode: 2, stderr: "usage: write <path> \"text\"" }; await ctx.fs!.write(path(args[0]), args.slice(1).join(" ")); return { exitCode: 0, stdout: "Stored on JAM." };
      case "touch": await ctx.fs!.write(path(args[0]), ""); return { exitCode: 0, stdout: "Stored on JAM." };
      case "mkdir": await ctx.fs!.mkdir(path(args[0])); return { exitCode: 0 };
      case "rm": { const recursive = args[0] === "-r" || args[0] === "-R"; await ctx.fs!.remove(path(args[recursive ? 1 : 0]), recursive); return { exitCode: 0 }; }
      case "mv": await ctx.fs!.rename(path(args[0]), path(args[1])); return { exitCode: 0 };
      case "whoami": return { exitCode: 0, stdout: ctx.account?.address || "not connected" };
      case "status": { const network = await ctx.runtime.client.network(); return { exitCode: 0, stdout: `${network.name} · ${network.healthy ? "healthy" : "offline"}\nmode: ${ctx.runtime.mode}\ncomputer: ${ctx.computerServiceId || "none"}` }; }
      case "name": { if (args[0] === "claim") { const record = await ctx.names.claim(args[1], ctx.computerServiceId!); return { exitCode: 0, stdout: `Name claimed: ${record.name}` }; } if (args[0] === "bind") { const record = await ctx.names.bind(args[1], args[2] === "self" || !args[2] ? ctx.computerServiceId! : args[2]); return { exitCode: 0, stdout: `Name bound: jam://${record.name}` }; } if (args[0] === "show") { const record = await ctx.names.show(args[1]); return { exitCode: 0, stdout: `${record.name} → ${record.serviceId}` }; } return { exitCode: 2, stderr: "usage: name claim|show|bind <name>" }; }
      case "site": { if (args[0] === "publish") { const manifest = await ctx.fs!.publish(path(args[1] || "/home/user/Sites/home")); return { exitCode: 0, stdout: `Published ${Object.keys(manifest.files).length} file(s).` }; } if (args[0] === "status") { const manifest = await ctx.fs!.manifest(); return { exitCode: 0, stdout: manifest ? `Published ${Object.keys(manifest.files).length} file(s).` : "No site published." }; } if (args[0] === "open") { ctx.openApp("browser", "jam://alice"); return { exitCode: 0 }; } return { exitCode: 2, stderr: "usage: site status|publish [directory]|open" }; }
      case "service": { if (args[0] === "inspect") { const result = await ctx.runtime.computer.inspect(args[1]); return { exitCode: 0, stdout: JSON.stringify(result, null, 2) }; } if (args[0] === "call") { const result = await ctx.runtime.client.invokeService(args[1], new TextEncoder().encode(JSON.stringify({ op: "service:call", payload: args.slice(2).join(" ") })), { account: ctx.account }); return { exitCode: 0, stdout: new TextDecoder().decode(result.output) }; } return { exitCode: 2, stderr: "usage: service inspect|call <id>" }; }
      case "playground": ctx.openApp("playground"); return { exitCode: 0 };
      case "browser": ctx.openApp("browser", args[0]); return { exitCode: 0 };
      case "doom": ctx.openApp("doom"); return { exitCode: 0 };
      default: return { exitCode: 127, stderr: `${command}: command not found` };
    }
  } catch (e) { return { exitCode: 1, stderr: e instanceof Error ? e.message : "Command failed" }; }
}
