import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { loadBrowserScript } from "./helpers/load-script.js";

let buildAutoReplyMessage;
let context;

beforeEach(() => {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    chrome: {
      storage: { local: { get: () => Promise.resolve({}) } },
      runtime: { id: "mock-id", sendMessage: () => {} },
    },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    URL: URL,
    URLSearchParams: URLSearchParams,
  };
  context.window = context;

  loadBrowserScript("src/config/environments.js", context);
  loadBrowserScript("src/config/storageKeys.js", context);
  loadBrowserScript("src/content/xFeatures.js", context);

  buildAutoReplyMessage = context.buildAutoReplyMessage;
});

describe("buildAutoReplyMessage", () => {
  const template =
    "Hey @{username}, I enjoyed your post {post_url} so I tipped you ~{amount} on {chain}!\nTx: {tx_link}\nJoin: {grove_link} | {referral_link}";

  it("should replace all placeholders", () => {
    const result = buildAutoReplyMessage(template, {
      username: "alice",
      amount: 1.5,
      chain: "Base",
      tx_link: "https://basescan.org/tx/0x123",
      post_url: "https://x.com/alice/status/123",
      grove_link: "grove.city",
      referral_link: "grove.city/?ref=abc",
    });

    expect(result).toContain("@alice");
    expect(result).toContain("$1.50");
    expect(result).toContain("Base");
    expect(result).toContain("https://basescan.org/tx/0x123");
    expect(result).toContain("https://x.com/alice/status/123");
    expect(result).toContain("grove.city");
    expect(result).toContain("grove.city/?ref=abc");
  });

  it("should strip {post_url} placeholder when post_url is empty", () => {
    const result = buildAutoReplyMessage(template, {
      username: "bob",
      amount: 0.25,
      chain: "Base",
      tx_link: "https://basescan.org/tx/0x456",
      post_url: "",
      grove_link: "grove.city",
      referral_link: "grove.city",
    });

    expect(result).not.toContain("{post_url}");
    expect(result).toContain("@bob");
    expect(result).toContain("$0.25");
  });

  it("should strip {post_url} placeholder when post_url is undefined", () => {
    const result = buildAutoReplyMessage(template, {
      username: "carol",
      amount: 5,
      chain: "Solana",
      tx_link: "https://solscan.io/tx/abc",
      grove_link: "grove.city",
      referral_link: "grove.city",
    });

    expect(result).not.toContain("{post_url}");
  });

  it("should format amount as $X.XX", () => {
    const result = buildAutoReplyMessage("{amount}", { amount: 3 });
    expect(result).toBe("$3.00");
  });

  it("should handle missing optional fields gracefully", () => {
    const result = buildAutoReplyMessage("{username} {amount} {chain}", {});
    // Fields without data keep their placeholders
    expect(result).toBe("{username} {amount} {chain}");
  });
});
