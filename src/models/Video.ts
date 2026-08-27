import { Schema, model, models, type InferSchemaType } from "mongoose";

const videoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    embedCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

export type VideoDocument = InferSchemaType<typeof videoSchema> & {
  _id: { toString(): string };
  createdAt: Date;
};

export const Video = models.Video || model("Video", videoSchema);
