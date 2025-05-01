import { model, Schema } from "mongoose";

const PostSchema = new Schema({
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    cover: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true,
});

const Post = model('Post', PostSchema);
export default Post;