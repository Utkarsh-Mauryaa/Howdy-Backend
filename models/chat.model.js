import mongoose, { Schema } from 'mongoose'
const ObjectId = mongoose.ObjectId;
const chatSchema = new Schema({

    name: {
        type: String,
        required: true,
    },
    groupChat: {
        type: Boolean,
        default: false
    },
    creator: {
        type: ObjectId,
        ref: "User"
    }, 
    members: [{
        type: ObjectId,
        ref: "User"
    }]

}, {
    timestamps: true
});


// const Chat = mongoose.model("Chat", chatSchema);

// export default Chat

export const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);