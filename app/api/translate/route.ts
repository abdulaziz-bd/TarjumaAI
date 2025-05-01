import { NextResponse } from "next/server";

// This dynamic import will only happen on the server side
// and won't be included in the client bundle
let translationModel: any = null;

const initModels = async (): Promise<void> => {
  if (!translationModel) {
    console.log("Loading Translation model...");
    // Use dynamic import to avoid Webpack bundling issues with Sharp
    const { pipeline } = await import("@xenova/transformers");
    translationModel = await pipeline(
      "translation",
      "Xenova/nllb-200-distilled-600M" // Efficient translation model
    );
  }
};

/**
 * Translates text to the specified target language
 * @param text - The text to translate
 * @param targetLang - The target language code
 * @returns The translated text
 */
const translateText = async (
  text: string,
  targetLang: string
): Promise<string> => {
  try {
    // Map common locale codes to NLLB language codes
    const languageMap: { [key: string]: string } = {
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

    const nllbLang = languageMap[targetLang] || targetLang;
    const result = await translationModel(text, {
      src_lang: "eng_Latn",
      tgt_lang: nllbLang,
    });

    return result[0].translation_text;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text");
  }
};

/**
 * API route handler for text translation
 * @param request - The incoming request object
 * @returns The API response
 */
export async function POST(request: Request) {
  try {
    await initModels();

    // Parse the JSON request body
    const { text, targetLang } = (await request.json()) as {
      text?: string;
      targetLang?: string;
    };

    // Validate the input
    if (!text) {
      return NextResponse.json(
        { error: "No text provided for translation" },
        { status: 400 }
      );
    }

    if (!targetLang) {
      return NextResponse.json(
        { error: "No target language specified" },
        { status: 400 }
      );
    }

    // Log the received data
    console.log("Text to translate:", text);
    console.log("Target Language:", targetLang);

    // Translate the text
    const translatedText = await translateText(text, targetLang);

    // Log the result
    console.log("Translation:", translatedText);

    return NextResponse.json({
      originalText: text,
      translation: translatedText,
      targetLanguage: targetLang,
    });
  } catch (error) {
    console.error(
      "Error processing translation:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "Error processing translation" },
      { status: 500 }
    );
  }
}
