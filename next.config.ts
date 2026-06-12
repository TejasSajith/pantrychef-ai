import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel note: public/data/cleaned_recipes.json is read server-side via
  // fs.readFileSync in /api/generate-recipe. Vercel co-locates public/
  // files with the function bundle automatically, so no extra tracing
  // config is required for deployment.
};

export default nextConfig;
