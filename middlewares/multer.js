import multer from "multer";

const multerUpload = multer({
  limits: {
    fileSize: 1024 * 1024 * 6,
  },
});

export const singleAvatar = multerUpload.single("avatar"); // means i can send a single file
export const attachmentsMulter = multerUpload.array("files", 5); 


