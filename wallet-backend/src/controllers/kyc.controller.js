const prisma = require('../config/prisma');

//submit kyc
const submitKyc = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, national_id, date_of_birth, gender, address } = req.body;
    const files = req.files;

    // Validate required fields before hitting the DB
    if (!national_id?.trim()) return res.status(400).json({ success: false, message: 'National ID is required' });
    if (!full_name?.trim())   return res.status(400).json({ success: false, message: 'Full name is required' });
    if (!date_of_birth)       return res.status(400).json({ success: false, message: 'Date of birth is required' });
    if (!files?.front_image?.[0]) return res.status(400).json({ success: false, message: 'Front image is required' });
    if (!files?.back_image?.[0])  return res.status(400).json({ success: false, message: 'Back image is required' });
    if (!files?.selfie_image?.[0]) return res.status(400).json({ success: false, message: 'Selfie image is required' });

    const existing = await prisma.userKyc.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'KYC already exists',
      });
    }

    const kyc = await prisma.userKyc.create({
      data: {
        user_id: userId,
        national_id: national_id.trim(),
        full_name: full_name.trim(),
        date_of_birth: new Date(date_of_birth),
        gender: gender || null,
        address: address || null,

        front_image: files.front_image[0].filename,
        back_image: files.back_image[0].filename,
        selfie_image: files.selfie_image[0].filename,

        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'KYC submitted successfully',
      kyc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//display my kyc
const getMyKyc = async (req, res) => {
  try {
    const userId = req.user.userId;

    const kyc = await prisma.userKyc.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found',
      });
    }

    res.status(200).json(kyc);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//update kyc
const updateKyc = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, national_id, date_of_birth, gender, address } = req.body;

    const files = req.files;

    const existingKyc = await prisma.userKyc.findUnique({
      where: { user_id: userId },
    });

    if (!existingKyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC not found',
      });
    }

    const existingNationalId = await prisma.userKyc.findFirst({
      where: {
        national_id,
        NOT: { user_id: userId },
      },
    });

    if (existingNationalId) {
      return res.status(400).json({
        success: false,
        message: 'National ID already exists',
      });
    }

    // Resolve new values — required fields fall back to existing (never null)
    const newNationalId  = national_id?.trim()  || existingKyc.national_id;
    const newFullName    = full_name?.trim()     || existingKyc.full_name;
    const newDob         = date_of_birth ? new Date(date_of_birth) : existingKyc.date_of_birth;
    const newFrontImage  = files?.front_image?.[0]?.filename  ?? existingKyc.front_image;
    const newBackImage   = files?.back_image?.[0]?.filename   ?? existingKyc.back_image;
    const newSelfieImage = files?.selfie_image?.[0]?.filename ?? existingKyc.selfie_image;

    const updatedKyc = await prisma.userKyc.update({
      where: { user_id: userId },
      data: {
        national_id:   newNationalId,
        full_name:     newFullName,
        date_of_birth: newDob,
        gender:  gender !== undefined ? (gender || null) : existingKyc.gender,
        address: address !== undefined ? (address || null) : existingKyc.address,
        front_image:   newFrontImage,
        back_image:    newBackImage,
        selfie_image:  newSelfieImage,
        status: 'PENDING',
      },
    });

    res.status(200).json({
      success: true,
      message: 'KYC updated, waiting for verification',
      kyc: updatedKyc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// admin verifies user's kyc
const verifyKyc = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await prisma.userKyc.update({
      where: {
        id: Number(id),
      },
      data: {
        status: 'VERIFIED',
      },
    });

    res.status(200).json({
      success: true,
      message: 'KYC verified successfully',
      kyc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//admin rejects kyc
const rejectKyc = async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await prisma.userKyc.update({
      where: {
        id: Number(id),
      },
      data: {
        status: 'REJECTED',
      },
    });

    res.status(200).json({
      success: true,
      message: 'KYC rejected successfully',
      kyc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = { submitKyc, getMyKyc, updateKyc, verifyKyc, rejectKyc };
