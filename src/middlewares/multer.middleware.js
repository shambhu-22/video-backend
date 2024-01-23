import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)// only for small time file will be there in server before it'll be sent to cloudinary so file.originalname
    }
  })
  
  export const upload = multer({ 
    storage,
})