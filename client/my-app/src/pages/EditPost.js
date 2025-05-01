import React, { useEffect, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import { Navigate, useParams } from 'react-router-dom';
import Editor from '../Editor';

export default function EditPost() {
    const { id } = useParams();
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [content, setContent] = useState('');
    const [files, setFiles] = useState(null);
    const [redirect, setRedirect] = useState(false);
    const [cover, setCover] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await fetch(`http://localhost:4000/post/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch post');
                }
                const postInfo = await response.json();
                setTitle(postInfo.title);
                setContent(postInfo.content);
                setSummary(postInfo.summary);
                setCover(postInfo.cover);
                setIsLoading(false);
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            }
        };
        fetchPost();
    }, [id]);

    async function updatePost(ev) {
        ev.preventDefault();
        setIsLoading(true);
        setError(null);

        const data = new FormData();
        data.set('title', title);
        data.set('summary', summary);
        data.set('content', content);
        data.set('id', id);
        if (files?.[0]) {
            data.set('file', files[0]);
        }

        try {
            const response = await fetch('http://localhost:4000/post', {
                method: 'PUT',
                body: data,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to update post');
            }

            setRedirect(true);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    }

    if (redirect) {
        return <Navigate to={`/post/${id}`} />;
    }

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">Error: {error}</div>;
    }

    return (
        <div className="edit-post-container">
            <form onSubmit={updatePost} className="post-form">
                <h2>Edit Post</h2>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                    <label htmlFor="title">Title</label>
                    <input
                        id="title"
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="summary">Summary</label>
                    <input
                        id="summary"
                        type="text"
                        placeholder="Summary"
                        value={summary}
                        onChange={e => setSummary(e.target.value)}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="cover">Cover Image</label>
                    {cover && (
                        <div className="current-cover">
                            <p>Current Cover:</p>
                            <img 
                                src={`http://localhost:4000${cover}`} 
                                alt="Current cover" 
                                className="cover-preview"
                            />
                        </div>
                    )}
                    <input
                        id="cover"
                        type="file"
                        onChange={ev => setFiles(ev.target.files)}
                        accept="image/*"
                    />
                </div>
                
                <div className="form-group">
                    <label>Content</label>
                    <Editor 
                        onChange={setContent} 
                        value={content}
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Updating...' : 'Update Post'}
                </button>
            </form>
        </div>
    );
}