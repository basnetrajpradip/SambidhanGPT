import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDirectory = path.join(__dirname, '../uploads/pdfs');

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
	destination: function (_req, _file, cb) {
		cb(null, uploadDirectory);
	},
	filename: function (_req, file, cb) {
		cb(null, `${Date.now()}-${file.originalname}`);
	},
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (file.mimetype === 'application/pdf') {
		cb(null, true);
	} else {
		cb(new Error('Only PDF files are allowed!'));
	}
};

export const upload = multer({ storage, fileFilter });
