import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { loadBrowserScript } from "./helpers/load-script.js";

let buildAutoReplyMessage;
let getXActionFeedback;
let performXActionsAfterTip;
let addXSenderInfo;
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
  getXActionFeedback = context.getXActionFeedback;
  performXActionsAfterTip = context.performXActionsAfterTip;
  addXSenderInfo = context.addXSenderInfo;
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

describe("getXActionFeedback", () => {
  it("returns success message when both like and reply succeeded", () => {
    const result = getXActionFeedback({
      didLike: true,
      didReply: true,
      likeFailed: false,
      replyFailed: false,
    });
    expect(result).toEqual({
      message: "Liked & replied! Refresh to view.",
      variant: "success",
    });
  });

  it("returns success message when only like succeeded", () => {
    const result = getXActionFeedback({
      didLike: true,
      didReply: false,
      likeFailed: false,
      replyFailed: false,
    });
    expect(result).toEqual({
      message: "Post liked! Refresh to view.",
      variant: "success",
    });
  });

  it("returns success message when only reply succeeded", () => {
    const result = getXActionFeedback({
      didLike: false,
      didReply: true,
      likeFailed: false,
      replyFailed: false,
    });
    expect(result).toEqual({
      message: "Reply sent! Refresh to view.",
      variant: "success",
    });
  });

  it("returns warning when both like and reply failed", () => {
    const result = getXActionFeedback({
      didLike: false,
      didReply: false,
      likeFailed: true,
      replyFailed: true,
    });
    expect(result).toEqual({
      message: "Tip sent! Like/reply failed.",
      variant: "warning",
    });
  });

  it("returns warning when only like failed", () => {
    const result = getXActionFeedback({
      didLike: false,
      didReply: false,
      likeFailed: true,
      replyFailed: false,
    });
    expect(result).toEqual({
      message: "Tip sent! Like failed.",
      variant: "warning",
    });
  });

  it("returns warning when only reply failed", () => {
    const result = getXActionFeedback({
      didLike: false,
      didReply: false,
      likeFailed: false,
      replyFailed: true,
    });
    expect(result).toEqual({
      message: "Tip sent! Reply failed.",
      variant: "warning",
    });
  });

  it("returns null when no actions were attempted", () => {
    const result = getXActionFeedback({
      didLike: false,
      didReply: false,
      likeFailed: false,
      replyFailed: false,
    });
    expect(result).toBeNull();
  });
});

describe("performXActionsAfterTip", () => {
  const baseOptions = {
    tweetUrl: "https://x.com/alice/status/123",
    txHash: "0xabc",
    likeEnabled: true,
    replyEnabled: true,
    replyTemplate: "Tipped @{username} {amount} on {chain}!",
    username: "alice",
    chainName: "Base",
    explorerBaseUrl: "https://basescan.org/tx/",
    amount: 1.5,
  };

  function setupXAuth(overrides = {}) {
    context.XAuth = {
      extractTweetId: overrides.extractTweetId || (() => "123"),
      isLoggedIn: overrides.isLoggedIn || (() => Promise.resolve(true)),
      likeTweet: overrides.likeTweet || (() => Promise.resolve()),
      postReply: overrides.postReply || (() => Promise.resolve()),
      ...overrides,
    };
  }

  it("returns all-false when XAuth is undefined", async () => {
    // XAuth not set on context
    const result = await performXActionsAfterTip.call(context, baseOptions);
    expect(result).toEqual({
      didLike: false,
      didReply: false,
      likeFailed: false,
      replyFailed: false,
    });
  });

  it("returns all-false when both features are disabled", async () => {
    setupXAuth();
    const result = await performXActionsAfterTip.call(context, {
      ...baseOptions,
      likeEnabled: false,
      replyEnabled: false,
    });
    expect(result).toEqual({
      didLike: false,
      didReply: false,
      likeFailed: false,
      replyFailed: false,
    });
  });

  it("returns all-false when extractTweetId returns null", async () => {
    setupXAuth({ extractTweetId: () => null });
    const result = await performXActionsAfterTip.call(context, baseOptions);
    expect(result).toEqual({
      didLike: false,
      didReply: false,
      likeFailed: false,
      replyFailed: false,
    });
  });

  it("returns all-false when not logged in", async () => {
    setupXAuth({ isLoggedIn: () => Promise.resolve(false) });
    const result = await performXActionsAfterTip.call(context, baseOptions);
    expect(result).toEqual({
      didLike: false,
      didReply: false,
      likeFailed: false,
      replyFailed: false,
    });
  });

  it("succeeds for both like and reply", async () => {
    setupXAuth();
    const result = await performXActionsAfterTip.call(context, baseOptions);
    expect(result.didLike).toBe(true);
    expect(result.didReply).toBe(true);
    expect(result.likeFailed).toBe(false);
    expect(result.replyFailed).toBe(false);
  });

  it("handles like failure with reply success", async () => {
    setupXAuth({ likeTweet: () => Promise.reject(new Error("rate limited")) });
    const result = await performXActionsAfterTip.call(context, baseOptions);
    expect(result.didLike).toBe(false);
    expect(result.likeFailed).toBe(true);
    expect(result.didReply).toBe(true);
    expect(result.replyFailed).toBe(false);
  });

  it("handles like success with reply failure", async () => {
    setupXAuth({ postReply: () => Promise.reject(new Error("failed")) });
    const result = await performXActionsAfterTip.call(context, baseOptions);
    expect(result.didLike).toBe(true);
    expect(result.likeFailed).toBe(false);
    expect(result.didReply).toBe(false);
    expect(result.replyFailed).toBe(true);
  });

  it("skips reply when replyTemplate is falsy", async () => {
    const postReply = vi.fn();
    setupXAuth({ postReply });
    const result = await performXActionsAfterTip.call(context, {
      ...baseOptions,
      replyTemplate: "",
    });
    expect(result.didLike).toBe(true);
    expect(result.didReply).toBe(false);
    expect(result.replyFailed).toBe(false);
    expect(postReply).not.toHaveBeenCalled();
  });
});

describe("addXSenderInfo", () => {
  it("is a no-op when XAuth is undefined", async () => {
    const tipContext = {};
    await addXSenderInfo.call(context, tipContext);
    expect(tipContext.sender_username).toBeUndefined();
  });

  it("sets sender fields when getStoredUserInfo returns valid username", async () => {
    context.XAuth = {
      getStoredUserInfo: () => Promise.resolve({ username: "sender42" }),
    };
    const tipContext = {};
    await addXSenderInfo.call(context, tipContext);
    expect(tipContext.sender_username).toBe("sender42");
    expect(tipContext.sender_profile_url).toBe("https://x.com/sender42");
  });

  it('does NOT set fields when username is "Connected" (fallback)', async () => {
    context.XAuth = {
      getStoredUserInfo: () => Promise.resolve({ username: "Connected" }),
    };
    const tipContext = {};
    await addXSenderInfo.call(context, tipContext);
    expect(tipContext.sender_username).toBeUndefined();
  });

  it("does NOT set fields when getStoredUserInfo returns null", async () => {
    context.XAuth = { getStoredUserInfo: () => Promise.resolve(null) };
    const tipContext = {};
    await addXSenderInfo.call(context, tipContext);
    expect(tipContext.sender_username).toBeUndefined();
  });

  it("silently catches errors from getStoredUserInfo", async () => {
    context.XAuth = {
      getStoredUserInfo: () => Promise.reject(new Error("storage error")),
    };
    const tipContext = {};
    await addXSenderInfo.call(context, tipContext);
    expect(tipContext.sender_username).toBeUndefined();
  });
});
