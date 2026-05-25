// next.config.mjs
var nextConfig = {
  transpilePackages: ["sonner"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
      bodySizeLimit: "26mb"
      // 25MB evidence file + overhead (D-14, Pitfall 2)
    }
  }
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
