import { useEffect, useState } from "react";
import Post from "../Post";

export default function IndexPage() {
    const [posts, setPosts] = useState([]);
    
    useEffect(() => {
        fetch('http://localhost:4000/post')
            .then(response => response.json())
            .then(postsData => {
                console.log(postsData);
                setPosts(postsData); // Update the state with fetched data
            })
            .catch(error => {
                console.error('Error fetching posts:', error);
            });
    }, []);

    return (
        <>
            {posts.length > 0 && posts.map(post => (
                <Post key={post._id} {...post} />  // Added key prop
            ))}
        </>
    );
}