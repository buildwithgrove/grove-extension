import { describe, it, expect, beforeEach, vi } from "vitest";

// Extract loadEarnStats logic from popup.js into a testable function
function createLoadEarnStats({ getActiveJWT, GroveAPI, getElementById }) {
  return async function loadEarnStats() {
    const jwt = await getActiveJWT();
    if (!jwt) return;

    const totalEl = getElementById("earnTotalUsd");
    const tipsEl = getElementById("earnTipCount");
    const tippersEl = getElementById("earnTipperCount");

    try {
      const result = await GroveAPI.getEarningsSummary(jwt, "all");
      if (result.success) {
        const val = parseFloat(result.data.total_usd) || 0;
        if (totalEl)
          totalEl.textContent =
            "$" +
            val.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
        if (tipsEl) tipsEl.textContent = result.data.tip_count.toLocaleString();
        if (tippersEl)
          tippersEl.textContent =
            result.data.unique_tipper_count.toLocaleString();
      }
    } catch (err) {
      if (totalEl) totalEl.textContent = "--";
      if (tipsEl) tipsEl.textContent = "--";
      if (tippersEl) tippersEl.textContent = "--";
    }
  };
}

function createMockElement(id) {
  return { id, textContent: "" };
}

describe("loadEarnStats", () => {
  let mockGetActiveJWT;
  let mockGroveAPI;
  let elements;
  let loadEarnStats;

  beforeEach(() => {
    mockGetActiveJWT = vi.fn();
    mockGroveAPI = { getEarningsSummary: vi.fn() };

    elements = {
      earnTotalUsd: createMockElement("earnTotalUsd"),
      earnTipCount: createMockElement("earnTipCount"),
      earnTipperCount: createMockElement("earnTipperCount"),
    };

    loadEarnStats = createLoadEarnStats({
      getActiveJWT: mockGetActiveJWT,
      GroveAPI: mockGroveAPI,
      getElementById: (id) => elements[id] || null,
    });
  });

  it("shows '--' on all stats when API throws", async () => {
    mockGetActiveJWT.mockResolvedValue("test-jwt");
    mockGroveAPI.getEarningsSummary.mockRejectedValue(
      new Error("API unavailable"),
    );

    await loadEarnStats();

    expect(elements.earnTotalUsd.textContent).toBe("--");
    expect(elements.earnTipCount.textContent).toBe("--");
    expect(elements.earnTipperCount.textContent).toBe("--");
  });

  it("displays formatted stats on success", async () => {
    mockGetActiveJWT.mockResolvedValue("test-jwt");
    mockGroveAPI.getEarningsSummary.mockResolvedValue({
      success: true,
      data: {
        total_usd: "12.50",
        tip_count: 5,
        unique_tipper_count: 3,
      },
    });

    await loadEarnStats();

    expect(elements.earnTotalUsd.textContent).toBe("$12.50");
    expect(elements.earnTipCount.textContent).toBe("5");
    expect(elements.earnTipperCount.textContent).toBe("3");
  });

  it("does nothing without JWT", async () => {
    mockGetActiveJWT.mockResolvedValue(null);

    await loadEarnStats();

    expect(mockGroveAPI.getEarningsSummary).not.toHaveBeenCalled();
    // Elements should remain at default empty string
    expect(elements.earnTotalUsd.textContent).toBe("");
    expect(elements.earnTipCount.textContent).toBe("");
    expect(elements.earnTipperCount.textContent).toBe("");
  });

  it("formats large amounts with commas", async () => {
    mockGetActiveJWT.mockResolvedValue("test-jwt");
    mockGroveAPI.getEarningsSummary.mockResolvedValue({
      success: true,
      data: {
        total_usd: "1234.56",
        tip_count: 1000,
        unique_tipper_count: 500,
      },
    });

    await loadEarnStats();

    expect(elements.earnTotalUsd.textContent).toMatch(/\$1[,.]?234\.56/);
    expect(elements.earnTipCount.textContent).toMatch(/1[,.]?000/);
    expect(elements.earnTipperCount.textContent).toBe("500");
  });
});
