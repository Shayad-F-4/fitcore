import mongoose, { Document, Schema } from 'mongoose';

export interface IUploadedFile extends Document {
  filename: string;
  mimeType: string;
  data: Buffer;
  size: number;
  createdAt: Date;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'image/jpeg',
    },
    data: {
      type: Buffer,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const UploadedFile = mongoose.model<IUploadedFile>('UploadedFile', UploadedFileSchema);
