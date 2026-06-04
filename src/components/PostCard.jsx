// components/PostCard.jsx
import LikeButton from './LikeButton'

function PostCard({ one123, caption }) {
  return (
    <article>
      <p>{caption}</p>
      <button onClick={one123}>Click me</button>
    </article>
  )
}
export default PostCard

