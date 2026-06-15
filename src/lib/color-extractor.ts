"use client";

/**
 * Extracts the dominant color from an image URL using Canvas.
 * Returns an HSL string or hex if preferred.
 */
export const extractDominantColor = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    // Electron specific handling for local files if needed
    img.src = imageUrl;

    const timeout = setTimeout(() => {
      resolve("#62AC8A");
    }, 2000);

    img.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve("#62AC8A");
        return;
      }

      // Resize for performance
      canvas.width = 40;
      canvas.height = 40;
      ctx.drawImage(img, 0, 0, 40, 40);

      const imageData = ctx.getImageData(0, 0, 40, 40).data;
      let r = 0,
        g = 0,
        b = 0,
        count = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        const pr = imageData[i];
        const pg = imageData[i + 1];
        const pb = imageData[i + 2];
        const pa = imageData[i + 3];

        if (pa < 128) continue; // Skip transparency

        // Skip greys, blacks, and whites for better vibrancy
        const max = Math.max(pr, pg, pb);
        const min = Math.min(pr, pg, pb);
        if (max - min < 30) continue; // Low saturation
        if (max < 40 || min > 220) continue; // Too dark or too light

        r += pr;
        g += pg;
        b += pb;
        count++;
      }

      if (count === 0) {
        // Fallback catch-all if image is too monochromatic
        resolve("#62AC8A");
        return;
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      resolve(`rgb(${r}, ${g}, ${b})`);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve("#62AC8A");
    };
  });
};
