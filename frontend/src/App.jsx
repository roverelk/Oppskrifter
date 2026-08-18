import React, {useEffect, useState} from 'react'
import axios from 'axios'

function App(){
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(()=>{ fetchList() }, [])
  async function fetchList(){
    const r = await axios.get('/api/recipes')
    setRecipes(r.data)
  }
  async function openRecipe(dir){
    const r = await axios.get(`/api/recipes/${encodeURIComponent(dir)}`)
    setSelected(r.data)
  }
  async function handleDelete(dir){
    if(!confirm('Delete recipe?')) return
    await axios.delete(`/api/recipes/${encodeURIComponent(dir)}`)
    setSelected(null)
    fetchList()
  }

  return (
    <div style={{display:'flex',gap:20,padding:20,fontFamily:'sans-serif'}}>
      <div style={{width:300}}>
        <h2>Oppskrifter</h2>
        <button onClick={()=>setCreating(true)}>New recipe</button>
        <ul>
          {recipes.map(r=> (
            <li key={r.dir} style={{margin:'8px 0'}}>
              <a href='#' onClick={(e)=>{e.preventDefault(); openRecipe(r.dir)}}>{r.title}</a>
            </li>
          ))}
        </ul>
      </div>
      <div style={{flex:1}}>
        {creating && <CreateForm onDone={()=>{setCreating(false); fetchList()}} />}
        {selected && (
          <div>
            <h2>{selected.title}</h2>
            {selected.image_url && <img src={selected.image_url} alt='' style={{maxWidth:'100%',height:'auto'}}/>}
            <h3>Ingredients</h3>
            {selected.ingredients ? (
              <ul>{selected.ingredients.map((i,idx)=><li key={idx}>{i}</li>)}</ul>
            ) : <div dangerouslySetInnerHTML={{__html: selected.html}} />}
            <h3>Instructions</h3>
            {selected.instructions ? (
              <ol>{selected.instructions.map((s,idx)=><li key={idx}>{s}</li>)}</ol>
            ) : <div />}
            <div style={{marginTop:10}}>
              <button onClick={()=>handleDelete(selected.dir)}>Delete</button>
              <button onClick={()=>setSelected(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateForm({onDone}){
  const [title, setTitle] = useState('Bread')
  const [md, setMd] = useState('# Ingredients\n- 2 cups flour\n\n# Instructions\n1. Mix\n2. Bake')
  const [image, setImage] = useState(null)

  async function submit(e){
    e.preventDefault()
    const form = new FormData()
    const blob = new Blob([md], {type: 'text/markdown'})
    form.append('title', title)
    form.append('markdown_file', blob, `${title}.md`)
    if(image) form.append('image', image)
    await axios.post('/api/recipes', form, {headers:{'Content-Type':'multipart/form-data'}})
    onDone()
  }

  return (
    <form onSubmit={submit} style={{marginBottom:20}}>
      <div><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} /></label></div>
      <div>
        <label>Markdown</label><br/>
        <textarea rows={12} cols={80} value={md} onChange={e=>setMd(e.target.value)} />
      </div>
      <div>
        <label>Image <input type='file' accept='image/*' onChange={e=>setImage(e.target.files[0])} /></label>
      </div>
      <div><button type='submit'>Create</button> <button type='button' onClick={onDone}>Cancel</button></div>
    </form>
  )
}

export default App
