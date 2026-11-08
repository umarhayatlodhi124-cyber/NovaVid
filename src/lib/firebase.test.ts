import { describe, expect, it } from "vitest";
import {
  firebaseConfig,
  app,
  auth,
  db,
  storage,
  getFirebaseAnalytics,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
  saveUserProfile,
  getUserProfile,
  saveCloudProject,
  listUserCloudProjects,
  uploadUserAsset,
} from "./firebase";

describe("Firebase Live Integration & SDK Setup (novavid-ecfc8)", () => {
  it("verifies exact owner-supplied Firebase configuration credentials", () => {
    expect(firebaseConfig.projectId).toBe("novavid-ecfc8");
    expect(firebaseConfig.authDomain).toBe("novavid-ecfc8.firebaseapp.com");
    expect(firebaseConfig.storageBucket).toBe("novavid-ecfc8.firebasestorage.app");
    expect(firebaseConfig.messagingSenderId).toBe("566848341353");
    expect(firebaseConfig.appId).toBe("1:566848341353:web:7b3ec023671650659729f8");
    expect(firebaseConfig.measurementId).toBe("G-W8W71EES1N");
  });

  it("exports initialized Firebase core services without duplication", () => {
    expect(app).toBeDefined();
    expect(app.name).toBe("[DEFAULT]");
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
    expect(storage).toBeDefined();
  });

  it("safely handles getFirebaseAnalytics in test/headless environment without crashing", async () => {
    // In node test environment, window or isSupported may be false/no-op, but must not crash
    const analytics = await getFirebaseAnalytics();
    expect(analytics === null || typeof analytics === "object").toBe(true);
  });

  it("exports all required typed authentication and data access functions", () => {
    expect(typeof registerWithEmail).toBe("function");
    expect(typeof loginWithEmail).toBe("function");
    expect(typeof loginWithGoogle).toBe("function");
    expect(typeof logoutFirebase).toBe("function");
    expect(typeof saveUserProfile).toBe("function");
    expect(typeof getUserProfile).toBe("function");
    expect(typeof saveCloudProject).toBe("function");
    expect(typeof listUserCloudProjects).toBe("function");
    expect(typeof uploadUserAsset).toBe("function");
  });
});
