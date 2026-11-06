// Runs real commits in a throwaway repository with this folder as core.hooksPath,
// so the test exercises the hook exactly as git calls it.
// Run with: node --test .githooks/commit-msg.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const hooksDir = import.meta.dirname;

function commitWithHook(message) {
  const repo = mkdtempSync(join(tmpdir(), "commit-msg-test-"));
  // An empty global config keeps the developer's own git settings out of the test.
  const globalConfig = join(repo, "empty.gitconfig");
  writeFileSync(globalConfig, "");
  const env = { ...process.env, GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: "1" };
  const git = (...args) => execFileSync("git", args, { cwd: repo, env, encoding: "utf8" });
  try {
    git("init", "--quiet");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.com");
    git("config", "core.hooksPath", hooksDir);
    const messageFile = join(repo, "message.txt");
    writeFileSync(messageFile, message);
    git("commit", "--quiet", "--allow-empty", "--file", messageFile);
    return git("log", "-1", "--format=%B");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

test("removes a Co-Authored-By trailer naming Claude", () => {
  const result = commitWithHook("Add parser\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n");
  assert.equal(result.trim(), "Add parser");
});

test("removes a co-author trailer with an Anthropic address in any letter case", () => {
  const result = commitWithHook("Add parser\n\nco-authored-by: Bot <noreply@ANTHROPIC.com>\n");
  assert.equal(result.trim(), "Add parser");
});

test("removes the generated-with footer", () => {
  const result = commitWithHook(
    "Add parser\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n",
  );
  assert.equal(result.trim(), "Add parser");
});

test("removes the session link trailer", () => {
  const result = commitWithHook("Add parser\n\nClaude-Session: https://claude.ai/code/session_123\n");
  assert.equal(result.trim(), "Add parser");
});

test("keeps the body while removing attribution below it", () => {
  const result = commitWithHook(
    "Add parser\n\nParses decimal operands.\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n",
  );
  assert.equal(result.trim(), "Add parser\n\nParses decimal operands.");
});

test("keeps legitimate mentions of the CLAUDE.md file", () => {
  const message = "docs: update CLAUDE.md commit rules\n\nCLAUDE.md now lists the test commands.";
  assert.equal(commitWithHook(`${message}\n`).trim(), message);
});

test("keeps a human co-author", () => {
  const message = "Add parser\n\nCo-authored-by: Jane Doe <jane@example.com>";
  assert.equal(commitWithHook(`${message}\n`).trim(), message);
});

test("leaves no trailing blank lines behind", () => {
  const result = commitWithHook("Add parser\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n");
  assert.equal(result, "Add parser\n\n");
});

test("the hook file uses LF line endings so sh can run it on Windows", () => {
  const hook = readFileSync(join(hooksDir, "commit-msg"), "utf8");
  assert.ok(hook.startsWith("#!/bin/sh\n"));
  assert.ok(!hook.includes("\r"));
});
