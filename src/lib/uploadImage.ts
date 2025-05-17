import { v4 as uuidv4 } from 'uuid';

export async function uploadImage(file: File): Promise<string> {
  try {
    // Create a FormData instance
    const formData = new FormData();
    
    // Generate a unique filename
    const fileName = `${uuidv4()}-${file.name}`;
    formData.append('file', file, fileName);

    // Upload to your storage service
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}