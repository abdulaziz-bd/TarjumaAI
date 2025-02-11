import { pipeline } from "@xenova/transformers";
import { NextResponse } from "next/server";
import { AudioContext, OfflineAudioContext } from "node-web-audio-api";

let whisperModel: any = null;
let translationModel: any = null;

const initModels = async () => {
  if (!whisperModel) {
    console.log("Loading Whisper model...");
    whisperModel = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-base"
    );
  }
  if (!translationModel) {
    console.log("Loading Translation model...");
    translationModel = await pipeline(
      "translation",
      "Xenova/nllb-200-distilled-600M" // This is a smaller, efficient translation model
    );
  }
};

const resampleAudio = async (
  audioBuffer: any,
  targetSampleRate: number = 16000
) => {
  const targetLength = Math.round(audioBuffer.duration * targetSampleRate);
  const offlineCtx = new OfflineAudioContext({
    numberOfChannels: 1,
    length: targetLength,
    sampleRate: targetSampleRate,
  });

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);

  source.start(0);
  return await offlineCtx.startRendering();
};

const convertToMono = (audioBuffer: any) => {
  if (audioBuffer.numberOfChannels === 1) return audioBuffer;

  const offlineCtx = new OfflineAudioContext(
    1,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  return offlineCtx.startRendering();
};

const translateText = async (text: string, targetLang: string) => {
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

export async function POST(request: Request) {
  try {
    await initModels();

    // Parse the multipart/form-data request
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const targetLang = formData.get("targetLang") as string;

    if (!audioFile) {
      throw new Error("No audio file found in the request.");
    }

    if (!targetLang) {
      throw new Error("No target language specified.");
    }

    // Convert the File to an ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Log the received audio data
    console.log("Received Audio File:", audioFile);
    console.log("Audio File Size:", audioFile.size);
    console.log("Audio File Type:", audioFile.type);
    console.log("Target Language:", targetLang);

    // Decode the audio data
    const audioContext = new AudioContext();
    let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Log the initial audio buffer
    console.log("Initial Audio Buffer:", {
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
    });

    // Convert to mono if needed
    if (audioBuffer.numberOfChannels !== 1) {
      console.log("Converting to mono...");
      audioBuffer = await convertToMono(audioBuffer);
    }

    // Resample to 16kHz if needed
    if (audioBuffer.sampleRate !== 16000) {
      console.log("Resampling to 16kHz...");
      audioBuffer = await resampleAudio(audioBuffer, 16000);
    }

    // Log the processed audio buffer
    console.log("Processed Audio Buffer:", {
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      duration: audioBuffer.duration,
    });

    // Extract the audio data as a Float32Array
    const audioData = audioBuffer.getChannelData(0);

    // Process the audio with the Whisper model
    const transcriptionResult = await whisperModel(audioData);
    const transcribedText = transcriptionResult.text;

    // Translate the transcribed text
    const translatedText = await translateText(transcribedText, targetLang);

    // Log the results
    console.log("Transcription:", transcribedText);
    console.log("Translation:", translatedText);

    return NextResponse.json({
      transcription: transcribedText,
      translation: translatedText,
      confidence: transcriptionResult.confidence,
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      { error: "Error processing audio or translation" },
      { status: 400 }
    );
  }
}
