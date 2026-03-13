import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Extract resolveEnsName logic from popup.js into a testable function
function createResolveEnsName(fetchFn) {
  return async function resolveEnsName(address) {
    if (!address || !address.startsWith("0x")) {
      return null;
    }

    const addr = address.toLowerCase();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetchFn(
        `https://api.web3.bio/profile/${addr}`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const matchingProfiles = data.filter(
          (p) => p.address && p.address.toLowerCase() === addr,
        );

        // Prefer ENS (.eth but not .base.eth) over Basenames
        const ensProfile = matchingProfiles.find(
          (p) =>
            p.platform === "ens" ||
            (p.identity &&
              p.identity.endsWith(".eth") &&
              !p.identity.endsWith(".base.eth")),
        );
        if (ensProfile?.identity) {
          return ensProfile.identity;
        }

        // Fallback to Basenames (.base.eth)
        const baseProfile = matchingProfiles.find(
          (p) =>
            p.platform === "basenames" ||
            (p.identity && p.identity.endsWith(".base.eth")),
        );
        if (baseProfile?.identity) {
          return baseProfile.identity;
        }
      }
    } catch (e) {
      // ENS lookup failed — return null
    }

    return null;
  };
}

const TEST_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const TEST_ADDR_LOWER = TEST_ADDRESS.toLowerCase();

describe("resolveEnsName", () => {
  let mockFetch;
  let resolveEnsName;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    resolveEnsName = createResolveEnsName(mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ENS name when API returns matching profile", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            platform: "ens",
            identity: "vitalik.eth",
            address: TEST_ADDR_LOWER,
          },
        ]),
    });

    const result = await resolveEnsName(TEST_ADDRESS);
    expect(result).toBe("vitalik.eth");
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.web3.bio/profile/${TEST_ADDR_LOWER}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns Basename as fallback when no ENS profile exists", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            platform: "basenames",
            identity: "vitalik.base.eth",
            address: TEST_ADDR_LOWER,
          },
        ]),
    });

    const result = await resolveEnsName(TEST_ADDRESS);
    expect(result).toBe("vitalik.base.eth");
  });

  it("returns null for non-0x input", async () => {
    expect(await resolveEnsName(null)).toBeNull();
    expect(await resolveEnsName("notanaddress")).toBeNull();
    expect(await resolveEnsName("")).toBeNull();
    expect(await resolveEnsName(undefined)).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await resolveEnsName(TEST_ADDRESS);
    expect(result).toBeNull();
  });

  it("aborts fetch after 5s timeout", async () => {
    // fetch returns a promise that never resolves
    mockFetch.mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const promise = resolveEnsName(TEST_ADDRESS);

    // Advance past the 5s timeout
    await vi.advanceTimersByTimeAsync(5000);

    const result = await promise;
    expect(result).toBeNull();
  });

  it("filters out non-matching addresses", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            platform: "ens",
            identity: "someone-else.eth",
            address: "0xDIFFERENTADDRESS",
          },
        ]),
    });

    const result = await resolveEnsName(TEST_ADDRESS);
    expect(result).toBeNull();
  });

  it("prefers ENS over Basename when both match", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            platform: "basenames",
            identity: "vitalik.base.eth",
            address: TEST_ADDR_LOWER,
          },
          {
            platform: "ens",
            identity: "vitalik.eth",
            address: TEST_ADDR_LOWER,
          },
        ]),
    });

    const result = await resolveEnsName(TEST_ADDRESS);
    expect(result).toBe("vitalik.eth");
  });
});
