import { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.model.js";
import { Request } from "../models/request.model.js";
import User from "../models/user.model.js";
import { cookieOptions, sendToken } from "../utils/auth.util.js";
import { emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { getOtherMember } from "../utils/helper.js";
import { ErrorHandler } from "../utils/utility.js";

export const SignUp = tryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;
  const file = req.file;
  if (!file) return next(new ErrorHandler("Please upload avatar.", 400));

  const result = await uploadFilesToCloudinary([file]);
  const avatar = {
    publicId: result[0].publicId,
    url: result[0].url,
  };
  const user = await User.create({
    name,
    username,
    password,
    bio,
    avatar,
  });

  sendToken(res, user, 201, "User created");
});

export const SignIn = tryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid Username!", 404));
  const isMatch = await compare(password, user.password);
  if (!isMatch) return next(new ErrorHandler("Invalid Password!"));
  sendToken(res, user, 200, `Welcome Back, ${user.name}`);
});

export const getMyProfile = tryCatch(async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    user,
  });
});

export const Logout = tryCatch(async (req, res) => {
  res
    .status(200)
    .cookie("howdy-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logout successfully!",
    });
});

export const searchUser = tryCatch(async (req, res, next) => {
  const { name } = req.query;

  const privateChats = await Chat.find({
    groupChat: false,
    members: req.userId,
  }).select("members");

  const friendIds = privateChats
    .map((chat) => chat.members)
    .flat()
    .filter((memberId) => memberId.toString() !== req.userId.toString());

  const users = await User.find({
    _id: { $nin: [...friendIds, req.userId] },
    name: { $regex: name, $options: "i" },
  }).select("_id name avatar");

  res.status(200).json({
    success: true,
    users: users.map((user) => ({
      _id: user._id,
      name: user.name,
      avatar: user.avatar?.url,
    })),
  });
});

export const sendFriendRequest = tryCatch(async (req, res, next) => {
  const { receiverId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.userId, receiver: receiverId },
      { sender: receiverId, receiver: req.userId },
    ],
  });
  if (request)
    return next(new ErrorHandler("Friend request already sent", 400));
  await Request.create({
    sender: req.userId,
    receiver: receiverId,
  });
  emitEvent(req, NEW_REQUEST, [receiverId]); // this will notify the receiver about the new friend request
  res.status(200).json({
    success: true,
    message: "Friend request sent successfully",
  });
});

export const acceptFriendRequest = tryCatch(async (req, res, next) => {
  const { requestId, accepted } = req.body;
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");
  if (!request) return next(new ErrorHandler("Request not found", 404));
  if (request.receiver._id.toString() !== req.userId.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401),
    );
  if (!accepted) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend request rejected successfully",
    });
  }
  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} & ${request.receiver.name}`,
      groupChat: false,
    }),
    request.deleteOne(),
  ]);
  emitEvent(req, REFETCH_CHATS, members); // this will notify both users to refetch their chats
  res.status(200).json({
    success: true,
    message: "Friend request accepted successfully",
    senderId: request.sender._id,
  });
});

export const getMyNotifications = tryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.userId }).populate(
    "sender",
    "name avatar",
  );
  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  return res.status(200).json({
    success: true,
    allRequests,
  });
});

// this controller does 2 things
// 1. get my friends
// 2. get my friends who are not in a particular group chat (used when adding members to a group chat)
export const getMyFriends = tryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;
  const chats = await Chat.find({
    members: req.userId,
    groupChat: false,
  }).populate("members", "name avatar");
  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.userId);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    // we are assuming that frontend will send chatId only when we want to add members to a group chat, chat will be group chat in this case
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      // this logic is used to show me my friends who are not already in the group
      (friend) => !chat.members.includes(friend._id), // i want only those friends whose ids are not in the chat members array
    );
    res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export const getUserInfo = tryCatch(async (req, res, next) => {
  const userId = req.params.userId
  
  if (!userId) return null;

  const user = await User.findById(
    userId,
    "name avatar.url"
  ).lean();

  if (!user) return null;

  return res.status(200).json({
    _id: user._id,
    name: user.name,
    avatar: user.avatar?.url || null
  });
});