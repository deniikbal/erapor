// PDF Helper Functions

export function capitalizeWords(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

export function toUpperCase(str: string | null | undefined): string {
  return str ? str.toUpperCase() : '';
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export async function getBase64Image(url: string, maxWidth: number = 800, quality: number = 0.7): Promise<string | null> {
  try {
    console.log('Loading image from:', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to load image: ${url}, status: ${response.status}`);
      return null;
    }

    const blob = await response.blob();

    // Check if blob is valid
    if (blob.size === 0) {
      console.warn('Image blob is empty:', url);
      return null;
    }

    // Compress image using canvas
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if image is too large
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get canvas context');
            resolve(null);
            return;
          }

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          console.log('Image compressed successfully. Original:', blob.size, 'bytes');
          resolve(compressedBase64);
        } catch (error) {
          console.error('Error compressing image:', error);
          // Fallback to uncompressed
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }
      };

      img.onerror = () => {
        console.error('Image load error for:', url);
        resolve(null);
      };

      // Create object URL from blob
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', url, error);
    return null;
  }
}
