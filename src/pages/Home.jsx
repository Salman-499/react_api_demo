import { useState, useEffect } from 'react'
import axios from 'axios'
import Addpost from '../components/adpost.jsx'
import JobApplicationForm from '../components/JobApplicationForm.jsx'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")


  let url="https://jsonplaceholder.typicode.com/posts"

  useEffect(() => {

    // This is where we'll 
    

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setPosts(data)
        setLoading(false)
      })

      console.log({posts

      })

  }, [])

  const filtered = posts.filter((post) => {
    return post.title.toLowerCase().includes(query.toLowerCase())
  })


  return (
  
  <div>
    <JobApplicationForm />
  </div>
 
  
  )
}
