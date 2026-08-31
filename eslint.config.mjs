import nextConfig from "eslint-config-next";

export default [
  { ignores: [".next/**", "supabase/functions/**"] },
  ...nextConfig,
];
