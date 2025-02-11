/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Save the original externals
      const originalExternals = config.externals;

      // Replace externals with an array that includes our resolver function
      config.externals = [
        // Our resolver: if the request is "onnxruntime-node", mark it as external
        (context, request, callback) => {
          if (request === "onnxruntime-node") {
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
    }
    return config;
  },
};

export default nextConfig;
