import axios from 'axios';
import FormData from 'form-data';

import { env } from '../lib/env.js';

const PINATA_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

export class IpfsService {
  async uploadBuffer(buffer: Buffer, filename: string): Promise<string> {
    if (!env.pinataApiKey || !env.pinataSecretKey) {
      throw new Error('Pinata API credentials are not configured');
    }

     
    console.log(`IPFS upload - Filename: ${filename}, Buffer size: ${buffer.length} bytes`);

    const formData = new FormData();
    formData.append('file', buffer, {
      filename,
      contentType: filename.endsWith('.png') ? 'image/png' : filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream'
    });

    // Add metadata for better IPFS handling
    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        type: 'delivery-proof',
        timestamp: Date.now().toString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const response = await axios.post(PINATA_ENDPOINT, formData, {
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: env.pinataApiKey,
        pinata_secret_api_key: env.pinataSecretKey
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

     
    console.log('IPFS upload response:', {
      success: Boolean(response.data?.IpfsHash),
      hash: response.data?.IpfsHash,
      size: response.data?.PinSize
    });

    if (!response.data?.IpfsHash) {
      throw new Error('Pinata response did not contain an IPFS hash');
    }

    return response.data.IpfsHash as string;
  }
}

