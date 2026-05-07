import type { MetadataRoute } from "next";
import { webAppThemeColors } from "./theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homie",
    short_name: "Homie",
    description: "Household tasks for Ryan and Caroline.",
    start_url: "/",
    display: "standalone",
    background_color: webAppThemeColors.background,
    theme_color: webAppThemeColors.theme,
    icons: [
      {
        src: "/icons/homie-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/homie-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
