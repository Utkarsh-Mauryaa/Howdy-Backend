import jwt from "jsonwebtoken";
import { adminSecretKey } from "../app.js";
import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import User from "../models/user.model.js";
import { cookieOptions } from "../utils/auth.util.js";
import { ErrorHandler } from "../utils/utility.js";

export const adminLogin = tryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const isMatched = secretKey === adminSecretKey;
  if (!isMatched)
    return next(new ErrorHandler("Invalid Admin Secret Key", 401));

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);
  return res
    .status(200)
    .cookie("howdy-admin-token", token, {
      ...cookieOptions,
      maxAge: 10 * 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message: "Authenticated successfully, Welcome Boss!",
    });
});

export const adminLogout = tryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("howdy-admin-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Bye bye Boss!",
    });
});

export const getAdminData = tryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});

export const getAllUsers = tryCatch(async (req, res, next) => {
  const users = await User.find({});

  async function transform({ name, username, avatar, _id }) {
    const [groups, friends] = await Promise.all([
      Chat.countDocuments({ groupChat: true, members: _id }),
      Chat.countDocuments({ groupChat: false, members: _id }),
    ]);

    return {
      name,
      username,
      avatar: avatar.url,
      _id,
      groups,
      friends,
    };
  }

  const transformedUsers = await Promise.all(users.map(transform));
  return res.status(200).json({
    success: true,
    users: transformedUsers,
  });
});

export const getAllChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChat = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar?.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    }),
  );
  return res.status(200).json({
    success: true,
    chats: transformedChat,
  });
});

export const getAllMessages = tryCatch(async (req, res, next) => {
  
  const messages = await Message.find({})
    .populate("sender", "name avatar _id")
    .populate("chat", "name groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, sender, _id, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat?._id,
      chatName: chat?.name,
      groupChat: chat?.groupChat,
      sender: {
        _id: sender?._id,
        name: sender?.name,
        avatar: sender?.avatar.url,
      },
    }),
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

export const getDashboardStats = tryCatch(async (req, res, next) => {
  const [groupsCount, usersCount, messagesCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments({}),
      Message.countDocuments({}),
      Chat.countDocuments({}),
    ]);
  const today = new Date();
  const lastSeventhDay = new Date();
  lastSeventhDay.setDate(today.getDate() - 7);

  const lastSevenDaysMessages = await Message.find({
    createdAt: { $gte: lastSeventhDay },
  }).select("createdAt");

  const messages = new Array(7).fill(0); 
  lastSevenDaysMessages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const index = Math.floor(indexApprox);
    messages[6 - index] += 1; 
  });
  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart: messages,
  };
  return res.status(200).json({
    success: true,
    stats,
  });
});
