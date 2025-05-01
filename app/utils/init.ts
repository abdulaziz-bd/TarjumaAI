import fs from "fs";
import os from "os";
import path from "path";
import "server-only";
import TranslationService from "./translationService";

interface InitOptions {
  forceReload?: boolean;
}

// Path to the initialization lock file
const LOCK_FILE = path.join(os.tmpdir(), "model-cache", ".init-lock");

// Track initialization state across hot reloads
let initializationAttempted = false;
let initializationPromise: Promise<boolean> | null = null;

export async function initTranslationService(
  options: InitOptions = {}
): Promise<boolean> {
  const { forceReload = false } = options;

  // If we've already tried to initialize and there's no force reload,
  // return the existing promise or true if it's completed
  if (initializationAttempted && !forceReload) {
    if (initializationPromise) {
      return initializationPromise;
    }
    return true;
  }

  // Check for lock file to prevent reinitializing during development
  if (!forceReload && fs.existsSync(LOCK_FILE)) {
    const lockData = fs.readFileSync(LOCK_FILE, "utf-8");
    const lockTime = new Date(lockData).getTime();
    const now = Date.now();

    // If lock is less than 1 hour old, skip initialization
    if (now - lockTime < 60 * 60 * 1000) {
      console.log("Initialization previously completed, skipping");
      initializationAttempted = true;
      return true;
    }
  }

  initializationAttempted = true;

  // Create a new initialization promise
  initializationPromise = (async () => {
    try {
      console.log("Initializing translation service...");
      const translationService = TranslationService.getInstance();
      await translationService.init(forceReload);

      // Write lock file with current timestamp
      fs.writeFileSync(LOCK_FILE, new Date().toISOString());

      console.log("Translation service initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize translation service:", error);
      return false;
    } finally {
      // Clear the promise reference once done
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

// The following will run only once per server restart,
// not on every hot reload during development
if (typeof window === "undefined" && !initializationAttempted) {
  console.log("Starting initial translation service initialization");
  initTranslationService().catch((err) =>
    console.error("Failed initial translation service initialization:", err)
  );
}
