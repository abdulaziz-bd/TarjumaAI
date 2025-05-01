import fs from "fs";
import os from "os";
import path from "path";
import "server-only";

// Define types for the translation model
type TranslationResult = {
  translation_text: string;
};

type ProgressInfo = {
  file: string;
  progress: number;
  total: number;
};

// Custom cache directory outside of Next.js cache
const CACHE_DIR = path.join(os.tmpdir(), "model-cache");

// Create a file to track initialization status
const INIT_MARKER = path.join(CACHE_DIR, ".initialized");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Language mapping
const languageMap: Record<string, string> = {
  es: "spa_Latn",
  fr: "fra_Latn",
  de: "deu_Latn",
  it: "ita_Latn",
  pt: "por_Latn",
  zh: "zho_Hans",
  ja: "jpn_Jpan",
  ko: "kor_Hang",
  ru: "rus_Cyrl",
  ar: "ara_Arab",
  bn: "ben_Beng",
  // Add more mappings as needed
};

class TranslationService {
  private static instance: TranslationService | null = null;
  private translationModel: any = null;
  private detectionModel: any = null;
  private modelLoading: Promise<void> | null = null;
  private lastInitTime: number = 0;
  private readonly INIT_COOLDOWN = 10000; // 10 seconds cooldown between init attempts

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  public async init(forceReload = false): Promise<void> {
    // Check if initialization was recently attempted
    const now = Date.now();
    if (
      !forceReload &&
      this.modelLoading &&
      now - this.lastInitTime < this.INIT_COOLDOWN
    ) {
      console.log(
        "Initialization recently attempted, waiting for existing process..."
      );
      return this.modelLoading;
    }

    // Check if model is already loaded
    if (!forceReload && this.translationModel) {
      console.log("Translation model already loaded");
      return Promise.resolve();
    }

    // Check if initialization marker exists
    if (!forceReload && fs.existsSync(INIT_MARKER) && !this.modelLoading) {
      console.log("Found initialization marker, loading from cache");
    }

    this.lastInitTime = now;
    this.modelLoading = this.loadModel();
    return this.modelLoading;
  }

  private async loadModel(): Promise<void> {
    console.log("Loading Translation model...");

    try {
      // Set environment variables to use our custom cache
      process.env.TRANSFORMERS_CACHE = CACHE_DIR;
      process.env.HF_HOME = CACHE_DIR;

      // Use custom fetch options to bypass Next.js cache
      const originalFetch = global.fetch;
      global.fetch = async (
        url: RequestInfo | URL,
        options?: RequestInit
      ): Promise<Response> => {
        // Add cache: 'no-store' to bypass Next.js cache for model files
        if (url.toString().includes("huggingface.co")) {
          options = {
            ...options,
            cache: "no-store",
            next: { revalidate: 0 },
          };
        }
        return originalFetch(url, options);
      };

      // Dynamically import the pipeline to avoid bundling issues
      const { pipeline } = await import("@xenova/transformers");

      // Load a smaller model if you're having issues with the large one
      const modelId = "Xenova/nllb-200-distilled-600M";

      // Create a proper progress callback that handles undefined values
      const progressCallback = (progress: any) => {
        // Ensure all fields have default values
        const safeProgress: ProgressInfo = {
          file: progress?.file || "unknown file",
          progress: progress?.progress || 0,
          total: progress?.total || 100,
        };

        console.log(
          `Model loading: ${safeProgress.file} - ${safeProgress.progress}/${safeProgress.total}`
        );
      };

      // Use lower precision for better memory efficiency
      this.translationModel = await pipeline("translation", modelId, {
        quantized: true,
        progress_callback: progressCallback,
      });

      // We use the same model for language detection
      this.detectionModel = this.translationModel;

      // Restore original fetch
      global.fetch = originalFetch;

      // Create initialization marker
      fs.writeFileSync(INIT_MARKER, new Date().toISOString());

      console.log("Translation model loaded successfully");
    } catch (error) {
      console.error("Failed to load translation model:", error);
      this.modelLoading = null;
      throw error;
    }
  }

  /**
   * Detect the language of a text using the NLLB model
   * @param text The text to detect the language of
   * @returns The detected language code in NLLB format (e.g., "eng_Latn")
   */
  public async detectLanguage(text: string): Promise<string> {
    if (!this.detectionModel) {
      await this.init();
    }

    try {
      // NLLB can automatically detect the source language
      // We'll first try to translate to English without specifying source language
      const result = await this.detectionModel(text, {
        tgt_lang: "eng_Latn",
        // Not specifying src_lang will force NLLB to auto-detect
      });

      // The model should set the detected language in the metadata
      if (
        result &&
        result.length > 0 &&
        result[0].metadata &&
        result[0].metadata.src_lang
      ) {
        return result[0].metadata.src_lang;
      }

      // Fallback: if metadata is not available, we'll use a common language
      return "eng_Latn"; // Default to English if detection fails
    } catch (error) {
      console.error("Language detection error:", error);
      // Return a safe default in case of error
      return "eng_Latn";
    }
  }

  /**
   * Translate text from a detected or specified source language to a target language
   * @param text The text to translate
   * @param targetLang The target language code
   * @param sourceLang Optional source language code (if already detected)
   * @returns The translated text
   */
  public async translate(
    text: string,
    targetLang: string,
    sourceLang?: string
  ): Promise<string> {
    if (!this.translationModel) {
      await this.init();
    }

    try {
      const nllbTargetLang = languageMap[targetLang] || targetLang;

      // If source language is provided, use it, otherwise let NLLB auto-detect
      const options: any = {
        tgt_lang: nllbTargetLang,
      };

      if (sourceLang) {
        options.src_lang = sourceLang;
      }

      const result = await this.translationModel(text, options);

      return result[0].translation_text;
    } catch (error) {
      console.error("Translation error:", error);
      throw new Error("Failed to translate text");
    }
  }

  public isModelLoaded(): boolean {
    return this.translationModel !== null;
  }
}

// Export a singleton instance
export default TranslationService;
