import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // Required for MinIO and Cloudflare R2
});

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, type } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing filename or contentType' },
        { status: 400 }
      );
    }

    const key = `${type || 'audio'}/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Use public R2.dev URL for file access, not S3 API endpoint
    const fileUrl = process.env.NEXT_PUBLIC_S3_URL
      ? `${process.env.NEXT_PUBLIC_S3_URL}/${key}`
      : `${process.env.AWS_ENDPOINT}/${process.env.AWS_S3_BUCKET}/${key}`;

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
    });
  } catch (error) {
    console.error('Upload URL generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
