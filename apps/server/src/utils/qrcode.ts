import QRCode from 'qrcode';
import { env } from '../config/env';

/**
 * Generate QR code data URL for match join
 */
export async function generateMatchQRCode(joinCode: string): Promise<string> {
  const joinUrl = `${env.CLIENT_URL}/join/${joinCode}`;

  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Get join URL for a match
 */
export function getJoinUrl(joinCode: string): string {
  return `${env.CLIENT_URL}/join/${joinCode}`;
}
