import {memo} from 'react'

const Button = memo(function Button ({onClick, label}) {
    console.log({label})
    return <button onClick={onClick}>{label}</button>
})

export default Button