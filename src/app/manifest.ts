import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homie",
    short_name: "Homie",
    description: "Household tasks for Ryan and Caroline.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6faff",
    theme_color: "#0875d8",
    icons: [
      {
        src: "/icons/homie.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
