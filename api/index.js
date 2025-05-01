import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from './models/Post.js';

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const salt = bcrypt.genSaltSync(10);
const secret = 'asdnasdnaksnkasd1knkjn1j';

// Middleware
const uploadMiddleware = multer({ dest: 'uploads/' });

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect('mongodb+srv://mrzain903:mG3ehoIKBHFO4M8f@cluster0.8yhwohz.mongodb.net/blog?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// User Model
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Hash password before saving
UserSchema.pre('save', function(next) {
  if (!this.isModified('password')) return next();
  this.password = bcrypt.hashSync(this.password, salt);
  next();
});

const User = mongoose.model('User', UserSchema);

// Routes
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.create({ username, password });
    res.json({ 
      success: true,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });

    if (!userDoc) {
      return res.status(400).json({ message: 'Wrong credentials' });
    }

    const passOk = bcrypt.compareSync(password, userDoc.password);

    if (passOk) {
      jwt.sign(
        { username: userDoc.username, id: userDoc._id },
        secret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie('token', token, { 
            httpOnly: true,
            sameSite: 'none', 
            secure: true 
          }).json({
            id: userDoc._id,
            username: userDoc.username
          });
        }
      );
    } else {
      res.status(400).json({ message: 'Wrong credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', {
    sameSite: 'none',
    secure: true,
    expires: new Date(0)
  }).json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path: tempPath } = req.file;
    const ext = path.extname(originalname);
    const newFilename = Date.now() + ext; // Use timestamp for unique filename
    const newPath = path.join(__dirname, 'uploads', newFilename);

    // Ensure uploads directory exists
    if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
      fs.mkdirSync(path.join(__dirname, 'uploads'));
    }

    fs.renameSync(tempPath, newPath);

    const { title, summary, content } = req.body;
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;

      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: '/uploads/' + newFilename,
        author: info.id
      });

      res.json(postDoc);
    });
  } catch (err) {
    console.error('Error processing upload:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  try {
    // 1. Validate authentication
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // 2. Verify JWT and get user info
    const userInfo = await new Promise((resolve, reject) => {
      jwt.verify(token, secret, {}, (err, info) => {
        if (err) reject(err);
        resolve(info);
      });
    });

    // 3. Get data from request
    const { id, title, summary, content } = req.body;
    const file = req.file;

    // 4. Validate required fields
    if (!id || !title || !summary || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 5. Find the existing post
    const postDoc = await Post.findById(id);
    if (!postDoc) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // 6. Verify post ownership
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(userInfo.id);
    if (!isAuthor) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    // 7. Handle file upload if new file was provided
    let newPath = postDoc.cover; // Keep existing cover by default
    if (file) {
      const { originalname, path: tempPath } = file;
      const ext = path.extname(originalname);
      const newFilename = Date.now() + ext;
      newPath = '/uploads/' + newFilename;
      
      // Ensure uploads directory exists
      if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, 'uploads'));
      }
      
      fs.renameSync(tempPath, path.join(__dirname, newPath));
      
      // Delete old cover image if it exists
      if (postDoc.cover && postDoc.cover.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, postDoc.cover);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // 8. Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        title,
        summary,
        content,
        cover: newPath,
      },
      { new: true } // Return the updated document
    ).populate('author', ['username']);

    // 9. Return success response
    res.json(updatedPost);

  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Server error during post update' });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })  // This sorts by newest first
      .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/post', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 });  // Add sorting here as well
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/post/:id' , async(req,res) => {
  const {id} =req.params;
  const postDoc= await Post.findById(id).populate('author',['username']);
  res.json(postDoc);

});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));