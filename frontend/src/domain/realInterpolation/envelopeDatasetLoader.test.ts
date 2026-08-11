import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PUBLISHED_ENVELOPE_RELATIVE_PATH,
  buildPublishedEnvelopeDatasetUrl,
} from "../datasetPath";
import {
  __clearPublishedEnvelopeDatasetCacheForTests,
  fetchPublishedEnvelopeDataset,
  getOrLoadPublishedEnvelopeDataset,
  parsePublishedEnvelopePayload,
} from "./envelopeDatasetLoader";

const URL = "/dataset/_published/envelope/dataset.json";

function validDataset() {
  return {
    datasetIdentity: "ds-test",
    records: [
      {
        strategyRef: "pA.S1",
        target: { x: 20, y: 20 },
        cueSet: [{ x: 10, y: 16 }],
        secondSet: [
          { x: 50, y: 20 },
          { x: 70, y: 20 },
        ],
      },
    ],
  };
}

afterEach(() => {
  __clearPublishedEnvelopeDatasetCacheForTests();
});

describe("Published Envelope locator", () => {
  it("builds exact contract URL", () => {
    expect(PUBLISHED_ENVELOPE_RELATIVE_PATH).toBe(
      "_published/envelope/dataset.json"
    );
    expect(buildPublishedEnvelopeDatasetUrl()).toBe(URL);
  });
});

describe("parsePublishedEnvelopePayload", () => {
  it("accepts valid PublishedDataset with usable geometry", () => {
    const result = parsePublishedEnvelopePayload(validDataset(), URL);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.usableCount).toBe(1);
      expect(result.dataset.records?.length).toBe(1);
    }
  });

  it("rejects non-object root", () => {
    const result = parsePublishedEnvelopePayload([], URL);
    expect(result.kind).toBe("error");
  });

  it("rejects missing records array", () => {
    const result = parsePublishedEnvelopePayload({ datasetIdentity: "x" }, URL);
    expect(result.kind).toBe("error");
  });

  it("rejects records that are not an array", () => {
    const result = parsePublishedEnvelopePayload(
      { records: "nope" },
      URL
    );
    expect(result.kind).toBe("error");
  });

  it("returns empty when no usable Envelope geometry", () => {
    const result = parsePublishedEnvelopePayload(
      {
        records: [
          {
            strategyRef: "p.S1",
            target: { x: 1, y: 1 },
            cueSet: [],
            secondSet: [],
          },
        ],
      },
      URL
    );
    expect(result.kind).toBe("empty");
  });
});

describe("fetchPublishedEnvelopeDataset", () => {
  it("loads valid dataset", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => validDataset(),
    });
    const result = await fetchPublishedEnvelopeDataset(fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(URL);
    expect(result.kind).toBe("ok");
  });

  it("maps JSON parse failure to error", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => {
        throw new Error("bad");
      },
    });
    const result = await fetchPublishedEnvelopeDataset(fetchFn);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toMatch(/JSON parse/i);
    }
  });

  it("maps 404 to empty", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 404, ok: false });
    const result = await fetchPublishedEnvelopeDataset(fetchFn);
    expect(result.kind).toBe("empty");
  });

  it("maps network failure to error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await fetchPublishedEnvelopeDataset(fetchFn);
    expect(result.kind).toBe("error");
  });
});

describe("getOrLoadPublishedEnvelopeDataset cache", () => {
  it("reuses successful cache", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => validDataset(),
    });
    const a = await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    const b = await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    expect(a.kind).toBe("ok");
    expect(b.kind).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight fetch for concurrent callers", async () => {
    let resolveJson: (v: unknown) => void = () => {};
    const jsonPromise = new Promise((resolve) => {
      resolveJson = resolve;
    });
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => jsonPromise,
    });

    const p1 = getOrLoadPublishedEnvelopeDataset({ fetchFn });
    const p2 = getOrLoadPublishedEnvelopeDataset({ fetchFn });
    resolveJson(validDataset());
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(r1.kind).toBe("ok");
    expect(r2.kind).toBe("ok");
  });

  it("does not poison retry after error", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => validDataset(),
      });

    const first = await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    expect(first.kind).toBe("error");

    const second = await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    expect(second.kind).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("force bypasses empty cache", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ status: 404, ok: false })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => validDataset(),
      });

    const first = await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    expect(first.kind).toBe("empty");
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const cached = await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    expect(cached.kind).toBe("empty");
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const forced = await getOrLoadPublishedEnvelopeDataset({
      fetchFn,
      force: true,
    });
    expect(forced.kind).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("test cache reset clears success cache", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => validDataset(),
    });
    await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    __clearPublishedEnvelopeDatasetCacheForTests();
    await getOrLoadPublishedEnvelopeDataset({ fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
