/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/v1/:path*`
      }
    ];
  }
};

export default nextConfig;
