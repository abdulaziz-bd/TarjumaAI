/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Save the original externals
      const originalExternals = config.externals;

      // Replace externals with an array that includes our resolver function
      config.externals = [
        // Our resolver: if the request is "onnxruntime-node" or includes "sharp", mark it as external
        (context, request, callback) => {
          if (
            request === "onnxruntime-node" ||
            request.includes("sharp") ||
            request.includes("sharp-darwin") ||
            request.includes("/sharp/")
          ) {
            return callback(null, "commonjs " + request);
          }
          // Otherwise, defer to the original externals
          if (typeof originalExternals === "function") {
            originalExternals(context, request, callback);
          } else {
            callback();
          }
        },
        // Include any original externals if they are an array
        ...(Array.isArray(originalExternals) ? originalExternals : []),
      ];
    } else {
      // Client-side specific configurations

      // Add a rule to handle web workers
      config.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        use: { loader: "worker-loader" },
        type: "javascript/auto",
      });

      // Tell webpack to ignore these modules in browser builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        sharp: false,
        "sharp-darwin-arm64v8.node": false,
        "onnxruntime-node": false,
      };
    }

    return config;
  },
  // Add any other Next.js config options here
};

export default nextConfig;
