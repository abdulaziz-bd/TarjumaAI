// This is a web worker that loads the Whisper model and runs inference on it.
// Copyright webgpu-whisper repository authors.

import {
  AutoProcessor,
  AutoTokenizer,
  TextStreamer,
  WhisperForConditionalGeneration,
  full,
} from "@huggingface/transformers";

const MAX_NEW_TOKENS = 64;

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class AutomaticSpeechRecognitionPipeline {
  static model_id = null;
  static tokenizer = null;
  static processor = null;
  static model = null;

  static async getInstance(progress_callback = null) {
    this.model_id = "onnx-community/whisper-base";

    if (!this.tokenizer) {
      this.tokenizer = await AutoTokenizer.from_pretrained(this.model_id, {
        progress_callback,
      });
    }

    if (!this.processor) {
      this.processor = await AutoProcessor.from_pretrained(this.model_id, {
        progress_callback,
      });
    }

    if (!this.model) {
      this.model = await WhisperForConditionalGeneration.from_pretrained(
        this.model_id,
        {
          dtype: {
            encoder_model: "fp32", // 'fp16' works too
            decoder_model_merged: "q4", // or 'fp32' ('fp16' is broken)
          },
          device: "webgpu",
          progress_callback,
        }
      );
    }

    return [this.tokenizer, this.processor, this.model];
  }
}

let processing = false;
async function generate({ audio, language }) {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: "start" });

  // Retrieve the text-generation pipeline.
  const [tokenizer, processor, model] =
    await AutomaticSpeechRecognitionPipeline.getInstance();

  let startTime;
  let numTokens = 0;
  const callback_function = (output) => {
    startTime ??= performance.now();

    let tps;
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
    self.postMessage({
      status: "update",
      output,
      tps,
      numTokens,
    });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
  });

  const inputs = await processor(audio);

  const outputs = await model.generate({
    ...inputs,
    max_new_tokens: MAX_NEW_TOKENS,
    language,
    streamer,
  });

  const outputText = tokenizer.batch_decode(outputs, {
    skip_special_tokens: true,
  });

  // Send the output back to the main thread
  self.postMessage({
    status: "complete",
    output: outputText,
  });
  processing = false;
}

async function load() {
  self.postMessage({
    status: "loading",
    data: "Loading model...",
  });

  try {
    // Load the pipeline and save it for future use.
    const [tokenizer, processor, model] =
      await AutomaticSpeechRecognitionPipeline.getInstance((x) => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
      });

    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    // Run model with dummy input to compile shaders
    if (typeof model.generate === "function") {
      await model.generate({
        input_features: full([1, 80, 3000], 0.0),
        max_new_tokens: 1,
      });
      self.postMessage({ status: "ready" });
    } else {
      throw new Error("Model generate method is not available");
    }
  } catch (error) {
    self.postMessage({
      status: "error",
      message: error.message || "Failed to load model",
    });
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      load();
      break;

    case "generate":
      generate(data);
      break;
  }
});
