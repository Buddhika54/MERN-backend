const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer();
const Technician = require('../Model/Technician'); // ✅ make sure path matches your folder name

exports.sendPdfToTechnician = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const pdfFile = req.file;

      

      if (!pdfFile) return res.status(400).json({ message: 'No PDF file uploaded.' });

      const technician = await Technician.findById(id);
      if (!technician) return res.status(404).json({ message: 'Technician not found' });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'maleenayk@gmail.com',
          pass: 'kuzwztmyztbasxjp' // Gmail App Password
        }
      });

      const mailOptions = {
        from: 'maleenayk@gmail.com',
        to: technician.email,
        subject: 'Your Assigned Work PDF',
        text: `Hi ${technician.name},\n\nPlease find your assigned work PDF attached.\n\nRegards,\nTea Factory`,
        attachments: [{ filename: pdfFile.originalname, content: pdfFile.buffer }]
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: `PDF successfully sent to ${technician.email}` });

    } catch (err) {
      console.error('❌ Error sending email:', err);
      res.status(500).json({ message: 'Failed to send email', error: err.message });
    }
  }
];
