const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/profile-pictures');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png|gif/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);
  
  if (extname && mimeType) {
    return cb(null, true);
  } else {
    cb('Error: Only images are allowed!');
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

const uploadProfilePicture = upload.single('profilePicture');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user); // Send the user data as response
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Route to update user profile (with image upload handling)
// ---- validation helpers for the profile -----------------------------------------------------
const toSkillList = (value) => {
  if (value === undefined) return undefined; // field not sent: leave the stored skills untouched
  const list = Array.isArray(value) ? value : [value];
  if (!list.every((v) => typeof v === "string")) throw new Error("Skills must be text.");
  const seen = new Set();
  const cleaned = [];
  for (const raw of list) {
    const skill = raw.trim();
    if (!skill || seen.has(skill.toLowerCase())) continue;
    if (skill.length > 50) throw new Error("Each skill must be 50 characters or less.");
    seen.add(skill.toLowerCase());
    cleaned.push(skill);
  }
  if (cleaned.length > 30) throw new Error("You can list at most 30 skills.");
  return cleaned;
};

const SOCIAL_KEYS = ["facebook", "twitter", "linkedin"];
const cleanSocials = (value) => {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") throw new Error("Socials must be an object.");
  const out = {};
  for (const key of SOCIAL_KEYS) {
    const link = value[key];
    if (link === undefined) continue;
    if (typeof link !== "string" || link.length > 200) throw new Error(`Invalid ${key} link.`);
    const trimmed = link.trim();
    // only http(s) links: a "javascript:" URL in a profile link would be a stored XSS
    if (trimmed && !/^https?:\/\/[^\s]+$/i.test(trimmed)) throw new Error(`The ${key} link must start with http:// or https://`);
    out[key] = trimmed;
  }
  return out;
};

// Update profile (partial updates are safe: fields that are not sent are left alone)
const updateUserProfile = async (req, res) => {
  const { name, status, socials, skillsToTeach, skillsToLearn } = req.body;
  const profilePicture = req.file ? req.file.filename : ''; // Handling the file upload

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    let teach, learn, links;
    try {
      teach = toSkillList(skillsToTeach);
      learn = toSkillList(skillsToLearn);
      links = cleanSocials(socials);
    } catch (validationErr) {
      return res.status(400).json({ msg: validationErr.message });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
        return res.status(400).json({ msg: 'Name must be 1-80 characters.' });
      }
      user.name = name.trim();
    }
    if (status !== undefined) {
      // "status" doubles as the admin block flag, so users cannot set it to "blocked" themselves
      if (typeof status !== 'string' || status.length > 100 || status.trim().toLowerCase() === 'blocked') {
        return res.status(400).json({ msg: 'Invalid status.' });
      }
      if (user.status !== 'blocked') user.status = status.trim();
    }
    if (links) user.socials = { ...(user.socials?.toObject?.() || user.socials || {}), ...links };
    if (teach) user.skillsToTeach = teach;
    if (learn) user.skillsToLearn = learn;
    if (profilePicture) user.profilePicture = profilePicture; // Set the new image

    await user.save();

    // never send the password hash back to the browser
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Change Password Controller
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ msg: 'Current and new password are required.' });
  }
  if (newPassword.length < 6 || Buffer.byteLength(newPassword) > 72) {
    return res.status(400).json({ msg: 'New password must be 6-72 characters.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ msg: 'New password must be different from the current one.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Export functions and upload middleware
module.exports = { getUserProfile, updateUserProfile, changePassword, uploadProfilePicture };
