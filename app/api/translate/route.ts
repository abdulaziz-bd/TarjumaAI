import TranslationService from "@/app/utils/translationService";
import { NextRequest, NextResponse } from "next/server";

// Set Response timeout to accommodate large model loading
export const maxDuration = 60; // 60 seconds

interface TranslationRequestBody {
  text?: string;
  targetLang?: string;
}

/**
 * API route handler for text translation
 * @param request - The incoming request object
 * @returns The API response
 */
export async function POST(request: NextRequest) {
  try {
    const translationService = TranslationService.getInstance();

    // Parse the JSON request body
    const { text, targetLang }: TranslationRequestBody = await request.json();

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

    // First, detect the source language using NLLB
    const detectedLanguage = await translationService.detectLanguage(text);
    console.log(`Detected language: ${detectedLanguage}`);

    // Then translate the text using the detected language as source
    const translatedText = await translationService.translate(
      text,
      targetLang,
      detectedLanguage
    );

    // Return the translation result with the detected language
    return NextResponse.json({
      originalText: text,
      translation: translatedText,
      targetLanguage: targetLang,
      detectedLanguage: detectedLanguage,
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
