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
          public_id: uuid(), // Changed from publicId to public_id
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
    });
  });

  const results = await Promise.all(uploadPromises);

  // Format the results to match your schema
  const formattedResults = results.map((result) => ({
    publicId: result.public_id, // Map public_id to publicId
    url: result.secure_url, // Use secure_url
  }));

  return formattedResults;
};
