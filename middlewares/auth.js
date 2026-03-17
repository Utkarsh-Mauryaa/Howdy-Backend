import jwt from "jsonwebtoken";
import { adminSecretKey } from "../app.js";
import { HOWDY_TOKEN } from "../config/corsConfig.js";
import User from "../models/user.model.js";
import { ErrorHandler } from "../utils/utility.js";

export const isAuthenticated = (req, res, next) => {
  const token = req.cookies[HOWDY_TOKEN];
  if (!token)
    return next(new ErrorHandler("Please login to access this route!", 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = decodedData._id;

  next();
};

export const adminAuthentication = (req, res, next) => {
  const token = req.cookies["howdy-admin-token"];
  if (!token)
    return next(new ErrorHandler("Only admin can access this route", 401));

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  const isMatched = secretKey === adminSecretKey;

  if (!isMatched)
    return next(new ErrorHandler("Only admin can access this route", 401));

  next();
};

export const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies[HOWDY_TOKEN];
    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));
    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decodedData._id);
    if(!user) return next(new ErrorHandler("Please login to access this route", 401));
    socket.user = user;
    return next();

  } catch (e) {
    console.log(e);
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};
