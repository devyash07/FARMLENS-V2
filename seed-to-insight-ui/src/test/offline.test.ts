/**
 * Phase 10 — Offline-first tests (part 1: DB + Network).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  savePendingScan,
  getPendingScans,
  updatePendingScan,
  deletePendingScan,
  MAX_OFFLINE_IMAGE_BYTES,
  MAX_PENDING_SCANS,
  type PendingScan,
} from "@/lib/offline-db";
import { getSyncStatus } from "@/lib/offline-sync";
import { getNetworkStatus, markServerReachable, markServerUnreachable } from "@/hooks/useNetworkStatus";

const mockUser = { userId: "user-123", email: "test@test.com" };

async function createScan(overrides: Partial<PendingScan> = {}): Promise<PendingScan> {
  const scan: PendingScan = {
    local_id: `local-${Date.now()}-${Math.random()}`,
    client_scan_id: `client-${Date.now()}-${Math.random()}`,
    user_id: mockUser.userId,
    image_blob: new Blob(["fake-image"], { type: "image/jpeg" }),
    preview_dataurl: "data:image/jpeg;base64,/9j/4AAQ==",
    filename: "test.jpg",
    file_size: 1024,
    file_type: "image/jpeg",
    status: "pending",
    retry_count: 0,
    permanent_failure: false,
    created_at: new Date().toISOString(),
    field_id: "field-1",
    field_name: "Tomato Field",
    crop: "Tomato",
    ...overrides,
  };
  await savePendingScan(scan);
  return scan;
}

describe("Phase 10 — Offline DB", () => {
  beforeEach(async () => {
    const all = await getPendingScans(mockUser.userId);
    for (const s of all) {
      await deletePendingScan(mockUser.userId, s.local_id);
    }
  });

  it("saves and retrieves a pending scan", async () => {
    const scan = await createScan();
    const scans = await getPendingScans(mockUser.userId);
    expect(scans.length).toBe(1);
    expect(scans[0].local_id).toBe(scan.local_id);
    expect(scans[0].status).toBe("pending");
  });

  it("persists image blob in IndexedDB", async () => {
    const scan = await createScan({ local_id: "blob-test", image_blob: new Blob(["test-blob"], { type: "image/jpeg" }) });
    const scans = await getPendingScans(mockUser.userId);
    const found = scans.find((s) => s.local_id === "blob-test");
    expect(found).toBeDefined();
    expect(found!.image_blob).toBeDefined();
    expect(found!.file_type).toBe("image/jpeg");
  });

  it("isolates scans by user_id", async () => {
    await createScan({ user_id: "user-A", local_id: "a1" });
    await createScan({ user_id: "user-B", local_id: "b1" });
    const scansA = await getPendingScans("user-A");
    const scansB = await getPendingScans("user-B");
    expect(scansA.length).toBe(1);
    expect(scansA[0].local_id).toBe("a1");
    expect(scansB.length).toBe(1);
    expect(scansB[0].local_id).toBe("b1");
  });

  it("returns empty array for user with no scans", async () => {
    const scans = await getPendingScans("no-such-user");
    expect(scans).toEqual([]);
  });

  it("updates a pending scan", async () => {
    const scan = await createScan();
    await updatePendingScan({ ...scan, status: "syncing" });
    const scans = await getPendingScans(mockUser.userId);
    expect(scans[0].status).toBe("syncing");
  });

  it("deletes a pending scan", async () => {
    const scan = await createScan();
    await deletePendingScan(mockUser.userId, scan.local_id);
    const scans = await getPendingScans(mockUser.userId);
    expect(scans.length).toBe(0);
  });

  it("returns scans oldest-first", async () => {
    await createScan({ local_id: "old", created_at: "2024-01-01T00:00:00Z" });
    await createScan({ local_id: "new", created_at: "2024-06-01T00:00:00Z" });
    const scans = await getPendingScans(mockUser.userId);
    expect(scans[0].local_id).toBe("old");
    expect(scans[1].local_id).toBe("new");
  });

  it("enforces storage limit", async () => {
    let caught = false;
    for (let i = 0; i < MAX_PENDING_SCANS + 5; i++) {
      try {
        await savePendingScan({
          local_id: `fill-${i}`,
          client_scan_id: `fill-${i}`,
          user_id: mockUser.userId,
          image_blob: new Blob(["x"], { type: "image/jpeg" }),
          preview_dataurl: "",
          filename: "f.jpg",
          file_size: 100,
          file_type: "image/jpeg",
          status: "pending",
          retry_count: 0,
          permanent_failure: false,
          created_at: new Date().toISOString(),
        });
      } catch (e: any) {
        expect(e.message).toContain("full");
        caught = true;
        break;
      }
    }
    expect(caught).toBe(true);
    const scans = await getPendingScans(mockUser.userId);
    expect(scans.length).toBeLessThanOrEqual(MAX_PENDING_SCANS);
  });

  it("validates file type", async () => {
    await expect(createScan({ file_type: "application/pdf" })).rejects.toThrow();
  });

  it("validates file size", async () => {
    await expect(createScan({ file_size: MAX_OFFLINE_IMAGE_BYTES + 1 })).rejects.toThrow();
  });
});

describe("Phase 10 — Network Status", () => {
  it("returns a valid network status", () => {
    const status = getNetworkStatus();
    expect(typeof status.isOnline).toBe("boolean");
  });

  it("marks server reachable", () => {
    markServerReachable();
    const status = getNetworkStatus();
    expect(status.connectionFailed).toBe(false);
  });

  it("marks server unreachable", () => {
    markServerUnreachable();
    const status = getNetworkStatus();
    expect(status.connectionFailed).toBe(true);
  });
});
