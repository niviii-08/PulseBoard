import { useEffect } from "react";

interface SeoMetaOptions {
  title: string;
  description: string;
  /** Optional schema.org JSON-LD object, stringified and injected as a <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown>;
}

/**
 * Minimal, dependency-free document <head> manager -- this project has
 * no react-helmet/react-helmet-async in package.json, and pulling one in
 * for a single page's meta tags would be a heavier dependency than the
 * problem needs. Directly mutates the existing <meta name="description">
 * tag from index.html (rather than creating a duplicate) and manages one
 * JSON-LD <script> by a stable id so repeated renders update it in place
 * instead of accumulating script tags.
 */
export function useSeoMeta({ title, description, jsonLd }: SeoMetaOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? null;
    descriptionTag?.setAttribute("content", description);

    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.getElementById("status-page-jsonld") as HTMLScriptElement | null;
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script");
        jsonLdScript.id = "status-page-jsonld";
        jsonLdScript.type = "application/ld+json";
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null) descriptionTag?.setAttribute("content", previousDescription);
      jsonLdScript?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, JSON.stringify(jsonLd)]);
}
