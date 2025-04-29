import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Navigate } from 'react-router-dom';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent',
  'link', 'image'
];

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState(null); // Changed from '' to null
  const [redirect, setRedirect] = useState(false); // Add this line

  async function createNewPost(ev) {
    ev.preventDefault();
    
    const data = new FormData();
    data.set('title', title);
    data.set('summary', summary);
    data.set('content', content);
    if (files && files[0]) {
      data.set('file', files[0]);
    }

    try {
      const response = await fetch('http://localhost:4000/post', {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
  
      const responseData = await response.json(); // Add this line
      console.log('API response:', responseData); // Log the response
  
      if (response.ok) {
        setRedirect(true);
      } else {
        console.error('Error response:', responseData);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  }
  

  if (redirect) {
    return <Navigate to={'/'} />;
  }

  return (
    <form onSubmit={createNewPost}>
      <h2>Create a New Post</h2>
      <input 
        type="text" 
        placeholder="Title" 
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <input 
        type="text" 
        placeholder="Summary" 
        value={summary}
        onChange={e => setSummary(e.target.value)}
      />
      <input 
        type="file"
        onChange={ev => setFiles(ev.target.files)}
      />
      <ReactQuill 
        theme="snow"
        value={content}
        onChange={setContent}
        modules={modules}
        formats={formats}
      />
      <button style={{ marginTop: '5px' }}>Create post</button>
    </form>
  );
}