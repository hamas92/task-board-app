/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server components
  serverExternalPackages: ['better-sqlite3'],
  // Prevent static generation from calling API routes during build
  env: {
    SKIP_DATABASE_OPERATIONS: process.env.VERCEL_ENV ? 'true' : 'false'
  }
};

export default nextConfig;