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

export async function getBase64Image(url: string): Promise<string | null> {
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
    
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('Image loaded successfully, size:', blob.size, 'bytes');
        resolve(result);
      };
      reader.onerror = () => {
        console.error('FileReader error for:', url);
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', url, error);
    return null;
  }
}
