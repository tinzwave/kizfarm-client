/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/public/home", destination: "/", permanent: true },
      { source: "/public/about", destination: "/about", permanent: true },
      { source: "/public/blog", destination: "/blog", permanent: true },
      { source: "/public/blog/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/public/contact", destination: "/contact", permanent: true },
      { source: "/public/login", destination: "/login", permanent: true },
      { source: "/public/signup", destination: "/signup", permanent: true },
      { source: "/public/otp", destination: "/otp", permanent: true },
    ];
  },
}

export default nextConfig
