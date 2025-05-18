import { NextRequest, NextResponse } from "next/server";

// Set Response timeout to accommodate large model loading
export const maxDuration = 60; // 60 seconds

interface TranslationRequestBody {
  text?: string;
  source_lang?: string;
  target_lang?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON request body
    const { text, source_lang, target_lang }: TranslationRequestBody =
      await request.json();

    // Validate the input
    if (!text) {
      return NextResponse.json(
        { error: "No text provided for translation" },
        { status: 400 }
      );
    }

    if (!target_lang) {
      return NextResponse.json(
        { error: "No target language specified" },
        { status: 400 }
      );
    }

    console.log(`${process.env.TRANSLATION_API_URL}translate`);

    // call the translation API
    const response = await fetch(
      `${process.env.TRANSLATION_API_URL}translate?text=${encodeURIComponent(
        text
      )}&source_lang=${encodeURIComponent(
        source_lang || ""
      )}&target_lang=${encodeURIComponent(target_lang)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    // Check if the response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Translation API error:", errorText);
      return NextResponse.json(
        { error: "Error from translation API" },
        { status: 500 }
      );
    }

    // Parse the response
    const { translation, source, target } = await response.json();

    // Return the translation result with the detected language
    return NextResponse.json({
      originalText: text,
      translation: translation,
      sourceLanguage: source,
      targetLanguage: target,
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
