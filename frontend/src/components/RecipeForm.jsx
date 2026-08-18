import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'

const TEMPLATE = `---
title: My recipe
tags: [dinner]
---

# Ingredients
- 2 cups flour

# Instructions
1. Mix
2. Bake
`

/**
 * One dialog for both creating and editing a recipe.
 * - create: POST /api/recipes  (title + markdown_file + optional image)
 * - edit:   POST /api/recipes/{dir}/edit  (optional markdown_file + image)
 *   The backend cannot rename a directory, so the title is fixed while editing.
 */
export default function RecipeForm({ open, mode, recipe, fullScreen, onClose, onSaved }) {
  const isEdit = mode === 'edit'
  const [title, setTitle] = useState('')
  const [md, setMd] = useState('')
  const [image, setImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Reset the fields every time the dialog is opened.
  useEffect(() => {
    if (!open) return
    setTitle(isEdit ? recipe?.title || '' : '')
    setMd(isEdit ? recipe?.markdown || '' : TEMPLATE)
    setImage(null)
    setError(null)
    setSaving(false)
  }, [open, isEdit, recipe])

  const canSave = isEdit ? md.trim() !== '' : title.trim() !== '' && md.trim() !== ''

  async function submit(e) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      const form = new FormData()
      if (isEdit) {
        form.append('markdown_file', new Blob([md], { type: 'text/markdown' }), `${recipe.dir}.md`)
        if (image) form.append('image', image)
        await axios.post(`/api/recipes/${encodeURIComponent(recipe.dir)}/edit`, form)
        onSaved(recipe.dir)
      } else {
        const name = title.trim()
        form.append('title', name)
        form.append('markdown_file', new Blob([md], { type: 'text/markdown' }), `${name}.md`)
        if (image) form.append('image', image)
        const res = await axios.post('/api/recipes', form)
        onSaved(res.data?.dir || name)
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not save the recipe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      {fullScreen ? (
        <AppBar position="relative">
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
              {isEdit ? 'Edit recipe' : 'New recipe'}
            </Typography>
            <Button
              color="inherit"
              onClick={submit}
              disabled={!canSave || saving}
              sx={{ '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.55)' } }}
            >
              Save
            </Button>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle>{isEdit ? 'Edit recipe' : 'New recipe'}</DialogTitle>
      )}

      <DialogContent dividers={!fullScreen}>
        <Stack component="form" id="recipe-form" onSubmit={submit} spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isEdit}
            required={!isEdit}
            fullWidth
            helperText={
              isEdit
                ? 'The title also names the folder on disk, so it cannot be changed here.'
                : 'Used as both the folder and the markdown file name.'
            }
          />
          <TextField
            label="Markdown"
            value={md}
            onChange={(e) => setMd(e.target.value)}
            multiline
            minRows={fullScreen ? 12 : 14}
            fullWidth
            required
            inputProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, monospace' } }}
            helperText="Use “# Ingredients” and “# Instructions” headings to get the structured view."
          />
          <Button
            component="label"
            variant="outlined"
            startIcon={<ImageOutlinedIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            {image ? image.name : isEdit ? 'Replace image' : 'Add image'}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0] || null)}
            />
          </Button>
        </Stack>
      </DialogContent>

      {!fullScreen && (
        <DialogActions>
          <Button onClick={onClose} disabled={saving} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            form="recipe-form"
            variant="contained"
            disabled={!canSave || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isEdit ? 'Save changes' : 'Create'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
