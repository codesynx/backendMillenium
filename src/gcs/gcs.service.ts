import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import 'multer';

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucketName = process.env.GCS_BUCKET_NAME || '';
const bucket = storage.bucket(bucketName);

export const uploadFile = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(uuidv4() + '-' + file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      // Return the file name instead of a public URL
      resolve(blob.name);
    });

    blobStream.end(file.buffer);
  });
};

export const getSignedUrl = async (fileName: string): Promise<string> => {
  const options = {
    version: 'v4' as const,
    action: 'read' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);
  return url;
};
