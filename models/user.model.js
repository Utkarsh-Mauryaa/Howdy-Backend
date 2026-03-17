import mongoose from "mongoose";
import {hash} from "bcrypt"

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  avatar: {
    publicId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
}, {
    timestamps: true
}
);

userSchema.pre("save",async function(next) {  // this is a mongoose middleware (hook)
  if(!this.isModified("password")) return next();  // this refers to the document being saved
  this.password = await hash(this.password, 10);
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
