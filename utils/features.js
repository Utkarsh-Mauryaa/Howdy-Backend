import { v2 as cloudinary } from "cloudinary";
import { ErrorHandler } from "./utility.js";
import { getBase64 } from "./helper.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./helper.js";

export const emitEvent = (req, event, users, data) => {
  let io = req.app.get("io");
  const usersSocket = getSockets(users);
  io.to(usersSocket).emit(event, data);
};

export const deleteFilesFromCloudinary = async (publicIds) => {
  console.log("Deleting files from Cloudinary:", publicIds);
};

export const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(), 
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
    });
  });

  const results = await Promise.all(uploadPromises);

  
  const formattedResults = results.map((result) => ({
    publicId: result.public_id, 
    url: result.secure_url, 
  }));

  return formattedResults;
};
