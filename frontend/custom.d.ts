// Type declarations for CSS module side-effect imports (e.g. leaflet)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
