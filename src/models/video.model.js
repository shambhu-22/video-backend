import mongoose, {Schema, model} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: true,
        unique: true
    },
    thumbnail: {
        type: String,
        unique: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true,
        index: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        lowercase: true,
        trim: true
    },
    duration: {
        type: Number,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, {timestamps: true});

videoSchema.plugin(mongooseAggregatePaginate);
export const Video = model("Video", videoSchema);